#!/bin/bash
set -e

# =================================================================
# deploy_init.sh - 一键初始化所有组件（本地执行）
# 按顺序调用各组件 setup 脚本，已安装的组件自动跳过
# =================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${GREEN}🚀 开始初始化服务器组件...${NC}"
echo ""

# 1. MySQL
echo -e "${YELLOW}═══ 1/4 MySQL ═══${NC}"
sh "$SCRIPT_DIR/setup_mysql.sh"

# 2. Redis
echo ""
echo -e "${YELLOW}═══ 2/4 Redis ═══${NC}"
sh "$SCRIPT_DIR/setup_redis.sh"

# 3. Go
echo ""
echo -e "${YELLOW}═══ 3/4 Golang ═══${NC}"
sh "$SCRIPT_DIR/setup_golang.sh"

# 4. Nginx
echo ""
echo -e "${YELLOW}═══ 4/4 Nginx ═══${NC}"
sh "$SCRIPT_DIR/setup_nginx.sh"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 所有组件初始化完成${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo "  1. sh ./deployment/deploy.sh          # 部署应用"
echo "  2. sh ./deployment/setup_sql_schema.sh # 建表+导入数据"
