#!/bin/bash
set -e

# =================================================================
# setup_golang.sh - Go SDK 安装（本地执行，远程自动安装）
# 通用组件初始化，与业务无关，可被多个项目复用
# =================================================================

REMOTE="nova"
GO_VERSION="${GO_VERSION:-1.25.8}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}🔧 Go 组件初始化${NC}"

# 检查 SSH 连接
if ! ssh -q "$REMOTE" "echo ok" &>/dev/null; then
    echo -e "${RED}❌ SSH 连接失败（ssh $REMOTE）${NC}"; exit 1
fi

# 生成远程脚本
REMOTE_SCRIPT=$(mktemp /tmp/setup_golang_remote.XXXXXX.sh)

cat > "$REMOTE_SCRIPT" << REMOTE_SCRIPT
#!/bin/bash
set -e
export PATH="\$PATH:/usr/local/go/bin:/usr/sbin:/usr/local/sbin:/sbin"

GO_VERSION="${GO_VERSION}"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

if [ "\$EUID" -ne 0 ]; then
    echo -e "\${YELLOW}请使用 sudo 运行\${NC}"; exit 1
fi

# ── 检查：版本匹配 → 跳过 ──
if [[ "\$(go version 2>/dev/null)" == *"go\$GO_VERSION"* ]]; then
    echo -e "\${GREEN}✅ Go \$GO_VERSION 已安装，跳过\${NC}"
    echo -e "   \$(go version)"
    exit 0
fi

# ── 安装 ──
echo -e "\${YELLOW}安装 Go \$GO_VERSION...\${NC}"
apt-get update -y
apt-get install -y wget tar

rm -rf /usr/local/go
wget -q "https://go.dev/dl/go\$GO_VERSION.linux-amd64.tar.gz"
tar -C /usr/local -xzf "go\$GO_VERSION.linux-amd64.tar.gz"
rm -f "go\$GO_VERSION.linux-amd64.tar.gz"

if ! grep -q "/usr/local/go/bin" /etc/profile; then
    echo 'export PATH=\$PATH:/usr/local/go/bin' >> /etc/profile
fi

# ── 验证 ──
export PATH="\$PATH:/usr/local/go/bin"
if go version &>/dev/null; then
    echo -e "\${GREEN}✅ Go 安装成功: \$(go version)${NC}"
else
    echo -e "\${RED}❌ Go 安装失败${NC}"; exit 1
fi

echo ""
echo -e "\${GREEN}------------------------------------------------${NC}"
echo -e "\${GREEN}✅ Go 初始化完成${NC}"
echo -e "   版本: \$GO_VERSION"
echo -e "   路径: /usr/local/go"
echo -e "\${GREEN}------------------------------------------------${NC}"
REMOTE_SCRIPT

echo -e "${YELLOW}📤 上传并执行...${NC}"
scp -q "$REMOTE_SCRIPT" "$REMOTE:/tmp/setup_golang_remote.sh"
ssh -q "$REMOTE" "sudo bash /tmp/setup_golang_remote.sh; rm -f /tmp/setup_golang_remote.sh"
rm -f "$REMOTE_SCRIPT"

echo -e "${GREEN}✅ Go 初始化完成${NC}"
