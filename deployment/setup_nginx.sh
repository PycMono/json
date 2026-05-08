#!/bin/bash
set -e

# =================================================================
# setup_nginx.sh - Nginx 安装 & 配置（本地执行，远程自动安装）
# 通用组件初始化，与业务无关，可被多个项目复用
# 不创建 server block（由各项目 deploy.sh 处理）
# =================================================================

REMOTE="nova"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}🔧 Nginx 组件初始化${NC}"

# 检查 SSH 连接
if ! ssh -q "$REMOTE" "echo ok" &>/dev/null; then
    echo -e "${RED}❌ SSH 连接失败（ssh $REMOTE）${NC}"; exit 1
fi

# 生成远程脚本
REMOTE_SCRIPT=$(mktemp /tmp/setup_nginx_remote.XXXXXX.sh)

cat > "$REMOTE_SCRIPT" << REMOTE_SCRIPT
#!/bin/bash
set -e
export PATH="\$PATH:/usr/sbin:/usr/local/sbin:/sbin"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

if [ "\$EUID" -ne 0 ]; then
    echo -e "\${YELLOW}请使用 sudo 运行\${NC}"; exit 1
fi

# ── 检查：已安装 + 运行中 → 跳过 ──
if command -v nginx &>/dev/null && systemctl is-active --quiet nginx; then
    echo -e "\${GREEN}✅ Nginx 已安装且运行中，跳过\${NC}"
    echo -e "   \$(nginx -v 2>&1)"
    exit 0
fi

# ── 安装 ──
echo -e "\${YELLOW}安装 Nginx + Certbot...\${NC}"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx ufw

# ── 确保 sites-available/sites-enabled 目录存在 ──
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

# 确保 nginx.conf 包含 sites-enabled
if ! grep -q "include.*sites-enabled" /etc/nginx/nginx.conf; then
    sed -i '/http {/a \\tinclude /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
fi

# ── 启动 ──
systemctl start nginx 2>/dev/null || true
systemctl enable nginx 2>/dev/null || true

# ── 防火墙 ──
ufw allow 22/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

# ── 验证 ──
if nginx -t 2>/dev/null && systemctl is-active --quiet nginx; then
    echo -e "\${GREEN}✅ Nginx 安装成功且运行正常${NC}"
else
    echo -e "\${RED}❌ Nginx 配置或启动失败${NC}"
    nginx -t 2>&1 || true
    exit 1
fi

echo ""
echo -e "\${GREEN}------------------------------------------------${NC}"
echo -e "\${GREEN}✅ Nginx 初始化完成${NC}"
echo -e "   端口: 80, 443"
echo -e "   配置: /etc/nginx/sites-available/"
echo -e "\${GREEN}------------------------------------------------${NC}"
REMOTE_SCRIPT

echo -e "${YELLOW}📤 上传并执行...${NC}"
scp -q "$REMOTE_SCRIPT" "$REMOTE:/tmp/setup_nginx_remote.sh"
ssh -q "$REMOTE" "sudo bash /tmp/setup_nginx_remote.sh; rm -f /tmp/setup_nginx_remote.sh"
rm -f "$REMOTE_SCRIPT"

echo -e "${GREEN}✅ Nginx 初始化完成${NC}"
