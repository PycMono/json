#!/bin/bash
set -e

# =================================================================
# setup_redis.sh - Redis 安装 & 配置（本地执行，远程自动安装）
# 通用组件初始化，与业务无关，可被多个项目复用
# =================================================================

REMOTE="nova"
REDIS_PASSWORD="${REDIS_PASSWORD:-123456}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}🔧 Redis 组件初始化${NC}"

# 检查 SSH 连接
if ! ssh -q "$REMOTE" "echo ok" &>/dev/null; then
    echo -e "${RED}❌ SSH 连接失败（ssh $REMOTE）${NC}"; exit 1
fi

# 生成远程脚本
REMOTE_SCRIPT=$(mktemp /tmp/setup_redis_remote.XXXXXX.sh)

cat > "$REMOTE_SCRIPT" << REMOTE_SCRIPT
#!/bin/bash
set -e
export PATH="\$PATH:/usr/sbin:/usr/local/sbin:/sbin"

REDIS_PASSWORD="${REDIS_PASSWORD}"
REDIS_CONF="/etc/redis/redis.conf"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

if [ "\$EUID" -ne 0 ]; then
    echo -e "\${YELLOW}请使用 sudo 运行\${NC}"; exit 1
fi

# ── 检查：已安装 + 密码正确 + PING 通 → 跳过 ──
if command -v redis-server &>/dev/null; then
    if systemctl is-active --quiet redis-server; then
        if redis-cli -a "\$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
            echo -e "\${GREEN}✅ Redis 已安装且运行正常，跳过\${NC}"
            echo -e "   \$(redis-server --version 2>&1 | head -1)"
            exit 0
        fi
    fi
fi

# ── 安装 ──
echo -e "\${YELLOW}安装 Redis Server...\${NC}"
apt-get update -y
apt-get install -y redis-server

systemctl start redis-server 2>/dev/null || true
systemctl enable redis-server 2>/dev/null || true
echo -e "\${GREEN}✅ Redis 安装完成: \$(redis-server --version 2>&1 | head -1)${NC}"

# ── 配置 ──
echo -e "\${YELLOW}配置 Redis...\${NC}"

if [ -f "\$REDIS_CONF" ]; then
    # 设置密码
    if grep -q "^requirepass" "\$REDIS_CONF"; then
        sed -i "s/^requirepass .*/requirepass \${REDIS_PASSWORD}/" "\$REDIS_CONF"
    else
        sed -i "s/^# requirepass .*/requirepass \${REDIS_PASSWORD}/" "\$REDIS_CONF"
        if ! grep -q "^requirepass" "\$REDIS_CONF"; then
            echo "requirepass \${REDIS_PASSWORD}" >> "\$REDIS_CONF"
        fi
    fi
    echo -e "\${GREEN}   密码已设置${NC}"

    # 绑定 127.0.0.1
    if ! grep -q "^bind 127.0.0.1" "\$REDIS_CONF"; then
        sed -i "s/^bind .*/bind 127.0.0.1/" "\$REDIS_CONF"
        echo -e "\${GREEN}   已绑定 127.0.0.1${NC}"
    fi

    # 禁用危险命令
    if ! grep -q "^rename-command FLUSHALL" "\$REDIS_CONF"; then
        echo 'rename-command FLUSHALL ""' >> "\$REDIS_CONF"
        echo 'rename-command FLUSHDB ""' >> "\$REDIS_CONF"
        echo -e "\${GREEN}   已禁用 FLUSHALL/FLUSHDB${NC}"
    fi

    systemctl restart redis-server
else
    echo -e "\${RED}❌ 配置文件不存在: \$REDIS_CONF${NC}"; exit 1
fi

# ── 验证 ──
sleep 1
if redis-cli -a "\$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
    echo -e "\${GREEN}✅ Redis 连接验证成功${NC}"
else
    echo -e "\${RED}❌ Redis 连接验证失败${NC}"; exit 1
fi

echo ""
echo -e "\${GREEN}------------------------------------------------${NC}"
echo -e "\${GREEN}✅ Redis 初始化完成${NC}"
echo -e "   地址: 127.0.0.1:6379"
echo -e "   密码: \$REDIS_PASSWORD"
echo -e "\${GREEN}------------------------------------------------${NC}"
REMOTE_SCRIPT

echo -e "${YELLOW}📤 上传并执行...${NC}"
scp -q "$REMOTE_SCRIPT" "$REMOTE:/tmp/setup_redis_remote.sh"
ssh -q "$REMOTE" "sudo bash /tmp/setup_redis_remote.sh; rm -f /tmp/setup_redis_remote.sh"
rm -f "$REMOTE_SCRIPT"

echo -e "${GREEN}✅ Redis 初始化完成${NC}"
