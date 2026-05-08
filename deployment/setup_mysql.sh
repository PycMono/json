#!/bin/bash
set -e

# =================================================================
# setup_mysql.sh - MySQL 安装 & 配置（本地执行，远程自动安装）
# 通用组件初始化，与业务无关，可被多个项目复用
# =================================================================

REMOTE="nova"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-123456}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}🔧 MySQL 组件初始化${NC}"

# 检查 SSH 连接
if ! ssh -q "$REMOTE" "echo ok" &>/dev/null; then
    echo -e "${RED}❌ SSH 连接失败（ssh $REMOTE）${NC}"; exit 1
fi

# 生成远程脚本
REMOTE_SCRIPT=$(mktemp /tmp/setup_mysql_remote.XXXXXX.sh)

cat > "$REMOTE_SCRIPT" << REMOTE_SCRIPT
#!/bin/bash
set -e
export PATH="\$PATH:/usr/sbin:/usr/local/sbin:/sbin"

MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

if [ "\$EUID" -ne 0 ]; then
    echo -e "\${YELLOW}请使用 sudo 运行\${NC}"; exit 1
fi

# ── 检查：已安装 + 可连接 → 跳过 ──
if command -v mysql &>/dev/null; then
    if mysql -u root -p"\${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" &>/dev/null; then
        echo -e "\${GREEN}✅ MySQL 已安装且运行正常，跳过\${NC}"
        echo -e "   版本: \$(mysql --version 2>&1)"
        exit 0
    fi
fi

# ── 安装 ──
echo -e "\${YELLOW}安装 MySQL Server...\${NC}"
apt-get update -y
export DEBIAN_FRONTEND=noninteractive
apt-get install -y mysql-server

systemctl start mysql 2>/dev/null || true
systemctl enable mysql 2>/dev/null || true
echo -e "\${GREEN}✅ MySQL 安装完成: \$(mysql --version 2>&1)${NC}"

# ── 配置 root 密码 ──
echo -e "\${YELLOW}配置 root 用户...\${NC}"
mysql -u root <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '\${MYSQL_ROOT_PASSWORD}';
FLUSH PRIVILEGES;
SQL

# ── 验证 ──
if mysql -u root -p"\${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" &>/dev/null; then
    echo -e "\${GREEN}✅ MySQL 连接验证成功${NC}"
else
    echo -e "\${RED}❌ MySQL 连接验证失败${NC}"; exit 1
fi

echo ""
echo -e "\${GREEN}------------------------------------------------${NC}"
echo -e "\${GREEN}✅ MySQL 初始化完成${NC}"
echo -e "   地址: 127.0.0.1:3306"
echo -e "   用户: root"
echo -e "   密码: \$MYSQL_ROOT_PASSWORD"
echo -e "\${GREEN}------------------------------------------------${NC}"
REMOTE_SCRIPT

echo -e "${YELLOW}📤 上传并执行...${NC}"
scp -q "$REMOTE_SCRIPT" "$REMOTE:/tmp/setup_mysql_remote.sh"
ssh -q "$REMOTE" "sudo bash /tmp/setup_mysql_remote.sh; rm -f /tmp/setup_mysql_remote.sh"
rm -f "$REMOTE_SCRIPT"

echo -e "${GREEN}✅ MySQL 初始化完成${NC}"
