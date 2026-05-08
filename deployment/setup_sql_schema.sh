#!/bin/bash
set -e

# =================================================================
# setup_sql_schema.sh - 首次建表 + 导入初始数据（本地执行）
# 上传 SQL 到服务器，远程执行建表和数据导入
# 幂等：表已存在跳过，数据已存在跳过
# =================================================================

REMOTE="nova"
REMOTE_DIR="/var/www/freesms"
SQL_DIR="./scripts/sql"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${YELLOW}📤 准备上传 SQL 文件到服务器...${NC}"

# 1. 检查本地 SQL 文件
if [ ! -d "$SQL_DIR" ]; then
    echo -e "${RED}❌ 本地 SQL 目录不存在: $SQL_DIR${NC}"; exit 1
fi

SQL_FILES=("schema.sql" "country.sql" "product.sql" "price.sql" "seed_proxies.sql")
MISSING=0
for f in "${SQL_FILES[@]}"; do
    if [ ! -f "$SQL_DIR/$f" ]; then
        echo -e "${RED}   ❌ 缺少: $SQL_DIR/$f${NC}"; MISSING=1
    else
        SIZE=$(wc -c < "$SQL_DIR/$f" | tr -d ' ')
        echo -e "${GREEN}   ✅ $f (${SIZE} bytes)${NC}"
    fi
done
[ "$MISSING" -eq 1 ] && echo -e "${RED}❌ 缺少必要 SQL 文件，终止${NC}" && exit 1

# 2. 上传所有 SQL 文件
echo ""
echo -e "${YELLOW}📤 上传 SQL 文件...${NC}"
ssh -q "$REMOTE" "mkdir -p $REMOTE_DIR/scripts/sql"
scp -q "$SQL_DIR"/*.sql "$REMOTE:$REMOTE_DIR/scripts/sql/"
echo -e "${GREEN}✅ SQL 文件上传完成${NC}"

# 3. 远程执行建表+导入
echo ""
echo -e "${YELLOW}📋 远程执行建表+导入数据...${NC}"

ssh -q "$REMOTE" << 'REMOTE_SCRIPT'
    set -e
    GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

    PROJECT_ROOT="/var/www/freesms"
    CONFIG_FILE="$PROJECT_ROOT/config.json"
    SQL_DIR="$PROJECT_ROOT/scripts/sql"

    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}❌ 找不到 config.json: $CONFIG_FILE${NC}"; exit 1
    fi

    # 读取 MySQL 配置
    read -r MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASS MYSQL_DB <<< $(python3 -c "
import json
with open('$CONFIG_FILE') as f:
    c = json.load(f)['mysql']
print(f\"{c['host']} {c['port']} {c['user']} {c['password']} {c['db_name']}\")
")

    echo -e "${YELLOW}📋 MySQL: host=$MYSQL_HOST port=$MYSQL_PORT user=$MYSQL_USER db=$MYSQL_DB${NC}"

    MYSQL_CMD="mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS"
    if ! $MYSQL_CMD -e "SELECT 1" &>/dev/null; then
        echo -e "${RED}❌ MySQL 连接失败${NC}"; exit 1
    fi
    echo -e "${GREEN}✅ MySQL 连接成功${NC}"

    # 1. 建表
    echo ""
    echo -e "${YELLOW}📋 步骤 1/2: 创建数据表...${NC}"
    if [ ! -f "$SQL_DIR/schema.sql" ]; then
        echo -e "${RED}❌ 找不到 schema.sql${NC}"; exit 1
    fi
    $MYSQL_CMD < "$SQL_DIR/schema.sql"
    echo -e "${GREEN}✅ 数据表创建完成${NC}"

    # 2. 导入数据
    echo ""
    echo -e "${YELLOW}📦 步骤 2/2: 导入数据...${NC}"
    # SQL 文件名 → 表名映射
    declare -A TABLE_MAP=(
        ["country.sql"]="sms_country"
        ["product.sql"]="sms_product"
        ["price.sql"]="sms_price"
        ["seed_proxies.sql"]="proxies"
    )
    imported=0; skipped=0; failed=0

    for sql_file in "${!TABLE_MAP[@]}"; do
        FILE_PATH="$SQL_DIR/$sql_file"
        [ ! -f "$FILE_PATH" ] && echo -e "${YELLOW}   ⚠️  $sql_file 不存在，跳过${NC}" && skipped=$((skipped + 1)) && continue

        TABLE_NAME="${TABLE_MAP[$sql_file]}"
        ROW_COUNT=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM \`$MYSQL_DB\`.\`${TABLE_NAME}\`;" 2>/dev/null || echo "-1")

        if [ "$ROW_COUNT" -gt 0 ] 2>/dev/null; then
            echo -e "${GREEN}   ⏭️  ${TABLE_NAME} 已有 ${ROW_COUNT} 条，跳过${NC}"
            skipped=$((skipped + 1)); continue
        fi

        echo -e "${YELLOW}   📥 导入 $sql_file → ${TABLE_NAME}...${NC}"
        if $MYSQL_CMD "$MYSQL_DB" < "$FILE_PATH" 2>/dev/null; then
            NEW_COUNT=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM \`$MYSQL_DB\`.\`${TABLE_NAME}\`;" 2>/dev/null || echo "?")
            echo -e "${GREEN}   ✅ ${TABLE_NAME} 导入成功，共 ${NEW_COUNT} 条${NC}"
            imported=$((imported + 1))
        else
            echo -e "${RED}   ❌ ${TABLE_NAME} 导入失败${NC}"; failed=$((failed + 1))
        fi
    done

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 数据库初始化完成${NC}"
    echo -e "   导入: ${imported}  跳过: ${skipped}  失败: ${failed}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    [ "$failed" -gt 0 ] && exit 1
REMOTE_SCRIPT

echo ""
echo -e "${GREEN}✅ 全部完成！${NC}"
