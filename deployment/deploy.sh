#!/bin/bash
set -e  # 任何命令失败立即退出

# --- 配置区 ---
REMOTE="nova"
REMOTE_DIR="/var/www/freesms"
APP_NAME="freesms"
GIN_PORT=5001                          # Go 服务监听端口
DOMAIN="smsin.me"
HEALTH_URL="http://127.0.0.1:${GIN_PORT}/"

# Cloudflare 缓存清除（可选）
# 部署前 export CF_ZONE_ID="your_zone_id" CF_API_TOKEN="your_api_token" 即可自动清除
CF_ZONE_ID="${CF_ZONE_ID:-}"
CF_API_TOKEN="${CF_API_TOKEN:-}"

echo "🚀 开始构建并部署到 $REMOTE..."

# 1. 清空 dist 目录，防止新旧 i18n 结构混入
echo "🧹 清空 dist 目录..."
rm -rf ./dist
mkdir -p ./dist

# 2. 构建
echo "🔨 编译 Go 二进制..."
export CGO_ENABLED=0 GOOS=linux GOARCH=amd64
go build -ldflags="-s -w" -o ./dist/$APP_NAME ./cmd/server/

# 3. 拷贝资源到 dist 目录
echo "📦 拷贝资源文件..."
mkdir -p ./dist/frontend
mkdir -p ./dist/common
cp -r frontend/templates ./dist/frontend/
[ -d "frontend/static" ] && cp -r frontend/static ./dist/frontend/
cp -r common/i18n ./dist/common/i18n
cp -r common/prompts ./dist/common/prompts
# 拷贝 SEO 文件
[ -f "ads.txt" ] && cp ads.txt ./dist/

# 4. 清理 macOS 影子文件，再打包（不含 config.json）
# macOS 会在目录中生成 ._* 和 .DS_Store 等元数据文件，Linux 上会导致 JSON 解析失败
echo "🧹 清理 macOS 影子文件..."
find ./dist -name "._*" -delete
find ./dist -name ".DS_Store" -delete

# COPYFILE_DISABLE=1 阻止 BSD tar 写入 Apple 扩展属性（消除 LIBARCHIVE 警告）
echo "📤 打包并上传..."
COPYFILE_DISABLE=1 tar -czf $APP_NAME.tar.gz -C ./dist .
scp -C $APP_NAME.tar.gz $REMOTE:/tmp/
scp -C config.json $REMOTE:/tmp/config.json.new

# 5. 远程部署
ssh -q -o LogLevel=QUIET $REMOTE << EOF
    set -e
    mkdir -p $REMOTE_DIR

    # 备份当前二进制，方便快速回滚
    if [ -f "$REMOTE_DIR/$APP_NAME" ]; then
        echo "💾 备份当前版本..."
        cp "$REMOTE_DIR/$APP_NAME" "$REMOTE_DIR/${APP_NAME}.bak" 2>/dev/null || true
    fi

    # 部署文件（grep 过滤 macOS tar 产生的 LIBARCHIVE xattr 警告，|| true 防止 grep 无匹配时 set -e 中断）
    tar -xzf /tmp/$APP_NAME.tar.gz -C $REMOTE_DIR 2>&1 | grep -v 'LIBARCHIVE.xattr' || true
    rm -f /tmp/$APP_NAME.tar.gz
    chmod +x $REMOTE_DIR/$APP_NAME

    # 确保 Nginx 有权读取静态资源（www-data 需要 read 权限）
    echo "🔐 修复文件权限..."
    find $REMOTE_DIR/frontend/static -type d -exec chmod 755 {} \; 2>/dev/null || true
    find $REMOTE_DIR/frontend/static -type f -exec chmod 644 {} \; 2>/dev/null || true
    # 修复 ads.txt 权限
    [ -f "$REMOTE_DIR/ads.txt" ] && chmod 644 $REMOTE_DIR/ads.txt 2>/dev/null || true

    # 验证关键目录存在
    echo "🔍 验证部署文件..."
    MISSING=0
    for dir in frontend/static/css frontend/static/js frontend/templates common/i18n common/prompts; do
        if [ ! -d "$REMOTE_DIR/\$dir" ]; then
            echo "❌ 缺少目录: $REMOTE_DIR/\$dir"
            MISSING=1
        fi
    done
    if [ "\$MISSING" -eq 1 ]; then
        echo "❌ 关键目录缺失，终止部署"
        exit 1
    fi
    echo "✅ 所有关键目录验证通过"

    # ── 修复 / 更新 Nginx 静态文件配置 ────────────────────────────────────────
    # 正确做法：location /static/ 必须在 server block 级别（不能嵌套在 location / 内）
    # 同时修复旧版缓存配置（expires 30d → 1y，no-transform → immutable）
    NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
    if [ -f "\$NGINX_CONF" ]; then

        # ① 修复旧版缓存头：
        #   - expires 30d → 1y
        #   - 旧版 no-transform → immutable
        #   - 去掉 expires 指令（避免与 add_header Cache-Control 产生两条 Cache-Control 头）
        sed -i 's/expires 30d;/expires 1y;/g' "\$NGINX_CONF" 2>/dev/null || true
        sed -i 's/Cache-Control "public, no-transform"/Cache-Control "public, max-age=31536000, immutable" always/g' "\$NGINX_CONF" 2>/dev/null || true
        sed -i 's/Cache-Control "public, immutable";/Cache-Control "public, max-age=31536000, immutable" always;/g' "\$NGINX_CONF" 2>/dev/null || true
        # 如果 location /static/ 里还有 expires 1y（旧配置），替换为 add_header 方式（防止双头）
        # 用 Python 精准处理，grep 保证只在有问题的配置上才执行
        if grep -q "location /static/" "\$NGINX_CONF" && grep -q "expires 1y" "\$NGINX_CONF"; then
            python3 - "\$NGINX_CONF" << 'PYEOF'
import re, sys
path = sys.argv[1]
with open(path) as f: content = f.read()
# 在 location /static/ 块内把 "expires 1y;" 替换为单一完整 Cache-Control 头
content = re.sub(
    r'(location\s+/static/\s*\{[^}]*)expires\s+1y;\s*',
    r'\1',
    content, flags=re.DOTALL
)
# 确保 add_header Cache-Control 包含 max-age
content = re.sub(
    r'add_header Cache-Control "public, immutable"',
    'add_header Cache-Control "public, max-age=31536000, immutable" always',
    content
)
with open(path, 'w') as f: f.write(content)
print("nginx static cache headers 已修复")
PYEOF
        fi

        # ② 若 location /static/ 完全缺失，使用 awk 插入到第一个 location / 之前（server block 级别）
        #    !inserted 守卫确保 certbot 生成多个 server block 时只插入一次
        if ! grep -q "location /static/" "\$NGINX_CONF"; then
            echo "⚙️  Nginx 缺少 /static/ 配置，正在修复（插入到 location / 之前）..."
            awk '!inserted && /^[[:space:]]*location[[:space:]]+\/[[:space:]]*\{/{
                print "    # 静态资源直接由 Nginx 提供（绕过 Go 代理，性能更优）"
                print "    location /static/ {"
                print "        alias $REMOTE_DIR/frontend/static/;"
                print "        add_header Cache-Control \"public, max-age=31536000, immutable\" always;"
                print "        add_header Vary \"Accept-Encoding\" always;"
                print "        access_log off;"
                print "    }"
                print ""
                inserted=1
            }
            { print }' "\$NGINX_CONF" > "\$NGINX_CONF.tmp" && mv "\$NGINX_CONF.tmp" "\$NGINX_CONF"
            echo "✅ Nginx /static/ location 已正确添加到 server block 级别"
        else
            echo "✅ Nginx /static/ location 配置已存在（缓存头已更新）"
        fi

        # ③ ads.txt 直接由 Nginx 服务（同样只插入一次）
        if [ -f "$REMOTE_DIR/ads.txt" ] && ! grep -q "location = /ads.txt" "\$NGINX_CONF"; then
            awk '!inserted && /^[[:space:]]*location[[:space:]]+\/[[:space:]]*\{/{
                print "    location = /ads.txt {"
                print "        root $REMOTE_DIR;"
                print "        expires 1d;"
                print "        add_header Cache-Control \"public\";"
                print "    }"
                print ""
                inserted=1
            }
            { print }' "\$NGINX_CONF" > "\$NGINX_CONF.tmp" && mv "\$NGINX_CONF.tmp" "\$NGINX_CONF"
        fi

        # ④ 测试并重新加载 Nginx
        if nginx -t 2>/dev/null; then
            systemctl reload nginx
            echo "✅ Nginx 配置已重新加载"
        else
            echo "❌ Nginx 配置测试失败，详情如下："
            nginx -t
            echo "⚠️  跳过 Nginx 重载，请手动检查配置文件: \$NGINX_CONF"
        fi
    else
        echo "⚙️  Nginx 配置文件不存在，创建初始配置..."

        # 从 config.json 读取端口（兜底用 GIN_PORT 变量）
        GIN_PORT_VAL=\$(python3 -c "
import json
with open('$REMOTE_DIR/config.json') as f:
    print(json.load(f).get('port', '${GIN_PORT}'))
" 2>/dev/null || echo "${GIN_PORT}")

        cat > "\$NGINX_CONF" <<'NGINXEOF'
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    server_tokens off;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;

    location /static/ {
        alias $REMOTE_DIR/frontend/static/;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header Vary "Accept-Encoding" always;
        access_log off;
    }

    location = /ads.txt {
        root $REMOTE_DIR;
        expires 1d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://127.0.0.1:__PORT__;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        proxy_send_timeout 60s;
    }
}
NGINXEOF
	sed -i "s/__PORT__/\$GIN_PORT_VAL/" "\$NGINX_CONF"

        ln -sf "\$NGINX_CONF" /etc/nginx/sites-enabled/

        if nginx -t 2>/dev/null; then
            systemctl reload nginx
            echo "✅ Nginx 初始配置创建成功"
        else
            echo "❌ Nginx 配置测试失败"
            nginx -t
        fi
    fi

    # 处理 config.json
    # ⚠️  远程 config.json 保存着线上 API Keys，不能整体覆盖。
    # 策略：本地有值、远程无值或缺少字段时，将本地值同步到远程
    if [ ! -f $REMOTE_DIR/config.json ]; then
        echo "⚙️  config.json 不存在，使用本地完整版本"
        mv /tmp/config.json.new $REMOTE_DIR/config.json
    else
        echo "⚙️  智能同步 config.json（本地有值 → 远程无值时自动补齐）..."
        python3 - "$REMOTE_DIR/config.json" "/tmp/config.json.new" << 'PYEOF'
import json, sys

remote_path = sys.argv[1]
local_path = sys.argv[2]

with open(remote_path) as f:
    remote = json.load(f)
with open(local_path) as f:
    local = json.load(f)

def deep_merge(remote_obj, local_obj, path=""):
    """递归合并：本地有值、远程无值或缺少字段时，用本地值补齐"""
    updated = []
    if isinstance(local_obj, dict) and isinstance(remote_obj, dict):
        for key in local_obj:
            local_val = local_obj[key]
            full_path = f"{path}.{key}" if path else key

            if key not in remote_obj:
                # 远程缺少整个字段 → 补齐
                remote_obj[key] = local_val
                updated.append(f"  + {full_path} = {json.dumps(local_val, ensure_ascii=False)}")
            elif isinstance(local_val, dict) and isinstance(remote_obj[key], dict):
                # 递归处理嵌套对象
                sub_updated = deep_merge(remote_obj[key], local_val, full_path)
                updated.extend(sub_updated)
            elif local_val != "" and local_val is not None and local_val != False:
                # 本地有有效值，检查远程是否为空
                remote_val = remote_obj[key]
                if remote_val == "" or remote_val is None:
                    remote_obj[key] = local_val
                    updated.append(f"  ~ {full_path}: {json.dumps(remote_val, ensure_ascii=False)} → {json.dumps(local_val, ensure_ascii=False)}")
    return updated

changes = deep_merge(remote, local)

if changes:
    print(f"   ✅ 同步 {len(changes)} 个字段:")
    for c in changes:
        print(c)
    with open(remote_path, 'w') as f:
        json.dump(remote, f, indent=2, ensure_ascii=False)
        f.write('\n')
else:
    print("   ✅ 无需同步，远程配置已是最新")

# asset_version 始终以本地为准（强制覆盖）
local_ver = local.get("asset_version", "")
if local_ver:
    remote["asset_version"] = local_ver
    with open(remote_path, 'w') as f:
        json.dump(remote, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f"   ✅ asset_version → {local_ver}")
PYEOF
        rm -f /tmp/config.json.new
    fi

    # 配置 Systemd 服务（仅首次）
    if [ ! -f /etc/systemd/system/$APP_NAME.service ]; then
        cat > /etc/systemd/system/$APP_NAME.service <<SERVICE
[Unit]
Description=$APP_NAME service
After=network.target

[Service]
Type=simple
WorkingDirectory=$REMOTE_DIR
ExecStart=$REMOTE_DIR/$APP_NAME
Restart=always
RestartSec=3
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
SERVICE
        systemctl daemon-reload
        systemctl enable $APP_NAME
    fi

    # 重启服务
    echo "🔄 重启 $APP_NAME 服务..."
    systemctl restart $APP_NAME

    # 等待进程启动（最多 10 秒）
    echo "⏳ 等待进程启动..."
    for i in \$(seq 1 10); do
        sleep 1
        if systemctl is-active --quiet $APP_NAME; then
            echo "✅ 服务正在运行"
            break
        fi
        if [ \$i -eq 10 ]; then
            echo "❌ 服务启动失败，最近日志："
            journalctl -u $APP_NAME -n 30 --no-pager
            exit 1
        fi
    done

    # 健康检查：确认 HTTP 能响应
    echo "🩺 健康检查..."
    for i in \$(seq 1 8); do
        sleep 1
        HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL 2>/dev/null || echo "000")
        if [ "\$HTTP_CODE" != "000" ]; then
            echo "✅ 健康检查通过（HTTP \$HTTP_CODE）"
            break
        fi
        if [ \$i -eq 8 ]; then
            echo "❌ 健康检查失败，服务无响应，最近日志："
            journalctl -u $APP_NAME -n 30 --no-pager
            exit 1
        fi
        echo "   等待中... (\$i/8)"
    done
EOF

rm -f $APP_NAME.tar.gz

# 6. Cloudflare 缓存清除（如配置了 CF_ZONE_ID + CF_API_TOKEN 则自动清除）
if [ -n "$CF_ZONE_ID" ] && [ -n "$CF_API_TOKEN" ]; then
    echo "🌐 清除 Cloudflare 缓存（全站 purge）..."
    PURGE_RESP=$(curl -s -X POST \
        "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
        -H "Authorization: Bearer $CF_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}')
    if echo "$PURGE_RESP" | grep -q '"success":true'; then
        echo "✅ Cloudflare 缓存已清除，访客将立即获取最新 CSS/JS"
    else
        echo "⚠️  Cloudflare 缓存清除失败: $PURGE_RESP"
        echo "   👉 请到 Cloudflare 控制台手动清除: https://dash.cloudflare.com → Caching → Purge Cache"
    fi
else
    echo ""
    echo "💡 样式更新后若线上仍显示旧样式，可能是 Cloudflare 缓存未清除。"
    echo "   方案一（推荐）：设置环境变量后重新部署："
    echo "     export CF_ZONE_ID='your_zone_id'"
    echo "     export CF_API_TOKEN='your_api_token'"
    echo "   方案二：Cloudflare 控制台 → Caching → Purge Everything"
    echo "   方案三：在 config.json 中更新 asset_version 值（触发 URL 变更绕过缓存）"
fi

echo ""
echo "✅ 部署完成！访问 https://smsin.me 验证"
