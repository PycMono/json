#!/bin/bash
set -e

# =================================================================
# exec_sql.sh - 增量执行 SQL 文件（在本地执行）
# 用途：手动选择要执行的 SQL 文件，上传到服务器并运行
# 特点：按文件名 + MD5 记录执行记录，避免重复执行
# =================================================================

# --- 配置区 ---
REMOTE="nova"                                   # SSH 别名
REMOTE_DIR="/var/www/freesms"                  # 服务器项目目录
SQL_DIR="./scripts/sql"                         # 本地 SQL 文件目录

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- 参数解析 ---
MODE="interactive"
FILES=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--all)
            MODE="all"
            shift
            ;;
        -l|--list)
            MODE="list"
            shift
            ;;
        -s|--status)
            MODE="status"
            shift
            ;;
        -h|--help)
            echo "用法: sh ./deployment/exec_sql.sh [选项] [文件...]"
            echo ""
            echo "选项:"
            echo "  -a, --all       执行所有未执行的 SQL 文件"
            echo "  -l, --list      列出可用的 SQL 文件"
            echo "  -s, --status    查看服务器上的执行记录"
            echo "  -h, --help      显示帮助信息"
            echo ""
            echo "示例:"
            echo "  sh ./deployment/exec_sql.sh                     # 交互模式"
            echo "  sh ./deployment/exec_sql.sh -a                  # 执行所有未执行的文件"
            echo "  sh ./deployment/exec_sql.sh auth_schema.sql     # 执行单个文件"
            echo "  sh ./deployment/exec_sql.sh a.sql b.sql         # 执行多个文件"
            echo "  sh ./deployment/exec_sql.sh -l                  # 查看文件列表"
            exit 0
            ;;
        -*)
            echo -e "${RED}未知参数: $1${NC}"
            exit 1
            ;;
        *)
            MODE="file"
            FILES+=("$1")
            shift
            ;;
    esac
done

# --- 列出本地文件 ---
if [ "$MODE" == "list" ]; then
    echo -e "${CYAN}📂 本地 SQL 文件 ($SQL_DIR):${NC}"
    echo ""
    if [ ! -d "$SQL_DIR" ]; then
        echo -e "${RED}❌ 目录不存在: $SQL_DIR${NC}"
        exit 1
    fi
    for f in "$SQL_DIR"/*.sql; do
        [ -f "$f" ] || continue
        SIZE=$(wc -c < "$f" | tr -d ' ')
        BASENAME=$(basename "$f")
        echo -e "  ${GREEN}$BASENAME${NC} (${SIZE} bytes)"
    done
    exit 0
fi

# --- 查看服务器执行记录 ---
if [ "$MODE" == "status" ]; then
    echo -e "${CYAN}📋 服务器执行记录:${NC}"
    echo ""
    ssh -q "$REMOTE" "bash -s" << 'REMOTE_STATUS'
        CONFIG_FILE="/var/www/freesms/config.json"
        if [ ! -f "$CONFIG_FILE" ]; then
            echo "❌ config.json 不存在"
            exit 1
        fi
        read -r MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASS MYSQL_DB <<< $(python3 -c "
import json
with open('$CONFIG_FILE') as f:
    c = json.load(f)['mysql']
print(f\"{c['host']} {c['port']} {c['user']} {c['password']} {c['db_name']}\")
")
        MYSQL_CMD="mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS $MYSQL_DB"

        EXISTS=$(mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS -N -e \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DB' AND table_name='_sql_exec_log';" 2>/dev/null || echo "0")
        if [ "$EXISTS" == "0" ]; then
            echo "  记录表尚未创建（首次执行 SQL 时会自动创建）"
        else
            $MYSQL_CMD -e "SELECT file_name, status, executed_at, rows_affected FROM _sql_exec_log ORDER BY executed_at DESC LIMIT 20;" 2>/dev/null || echo "  无法读取记录"
        fi
REMOTE_STATUS
    exit 0
fi

# --- 收集要执行的文件 ---
if [ ! -d "$SQL_DIR" ]; then
    echo -e "${RED}❌ 本地 SQL 目录不存在: $SQL_DIR${NC}"
    exit 1
fi

EXEC_FILES=()

if [ "$MODE" == "all" ]; then
    for f in "$SQL_DIR"/*.sql; do
        [ -f "$f" ] || continue
        EXEC_FILES+=("$(basename "$f")")
    done
elif [ "$MODE" == "file" ]; then
    for f in "${FILES[@]}"; do
        BASENAME=$(basename "$f")
        if [ ! -f "$SQL_DIR/$BASENAME" ]; then
            echo -e "${RED}❌ 文件不存在: $SQL_DIR/$BASENAME${NC}"
            exit 1
        fi
        EXEC_FILES+=("$BASENAME")
    done
else
    echo -e "${CYAN}📂 可用的 SQL 文件:${NC}"
    echo ""
    ALL_FILES=()
    i=1
    for f in "$SQL_DIR"/*.sql; do
        [ -f "$f" ] || continue
        BASENAME=$(basename "$f")
        SIZE=$(wc -c < "$f" | tr -d ' ')
        ALL_FILES+=("$BASENAME")
        echo -e "  ${GREEN}[$i]${NC} $BASENAME (${SIZE} bytes)"
        i=$((i + 1))
    done

    if [ ${#ALL_FILES[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠️  没有 SQL 文件${NC}"
        exit 0
    fi

    echo ""
    echo "输入要执行的文件编号（多个用空格分隔，a=全部，q=退出）："
    read -r INPUT

    if [ "$INPUT" == "q" ] || [ -z "$INPUT" ]; then
        echo "已取消"
        exit 0
    fi

    if [ "$INPUT" == "a" ]; then
        EXEC_FILES=("${ALL_FILES[@]}")
    else
        for num in $INPUT; do
            idx=$((num - 1))
            if [ $idx -ge 0 ] && [ $idx -lt ${#ALL_FILES[@]} ]; then
                EXEC_FILES+=("${ALL_FILES[$idx]}")
            else
                echo -e "${RED}❌ 无效编号: $num${NC}"
            fi
        done
    fi
fi

if [ ${#EXEC_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}没有选择要执行的文件${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}准备执行以下 SQL 文件:${NC}"
for f in "${EXEC_FILES[@]}"; do
    echo -e "  ${YELLOW}→ $f${NC}"
done
echo ""

# --- 上传文件 ---
echo -e "${YELLOW}📤 上传 SQL 文件到服务器...${NC}"
ssh -q "$REMOTE" "mkdir -p $REMOTE_DIR/scripts/sql"
scp -q "${EXEC_FILES[@]/#/$SQL_DIR/}" "$REMOTE:$REMOTE_DIR/scripts/sql/"
echo -e "${GREEN}✅ 文件上传完成${NC}"

# --- 生成远程执行脚本并执行 ---
echo ""
echo -e "${YELLOW}📋 远程执行 SQL...${NC}"

# 生成远程执行脚本（本地写好再传上去，避免 heredoc 嵌套问题）
REMOTE_SCRIPT=$(mktemp /tmp/exec_sql_remote.XXXXXX.sh)

cat > "$REMOTE_SCRIPT" << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

CONFIG_FILE="__REMOTE_DIR__/config.json"
SQL_DIR="__REMOTE_DIR__/scripts/sql"
LOG_TABLE="_sql_exec_log"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ config.json 不存在: $CONFIG_FILE"
    exit 1
fi

# 读取 MySQL 配置
read -r MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASS MYSQL_DB <<< $(python3 -c "
import json
with open('$CONFIG_FILE') as f:
    c = json.load(f)['mysql']
print(f\"{c['host']} {c['port']} {c['user']} {c['password']} {c['db_name']}\")
")

MYSQL_CMD="mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASS $MYSQL_DB"

# 连接测试
if ! $MYSQL_CMD -e "SELECT 1" &>/dev/null; then
    echo "❌ MySQL 连接失败"
    exit 1
fi

# 创建执行记录表（幂等）
$MYSQL_CMD <<'SQLLOG'
CREATE TABLE IF NOT EXISTS `_sql_exec_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `file_name` VARCHAR(255) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL DEFAULT '',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `rows_affected` INT NOT NULL DEFAULT 0,
    `error_msg` TEXT,
    `executed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_file_checksum` (`file_name`, `checksum`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQLLOG

# 逐个执行
EXEC_FILES=(__EXEC_FILES__)
SUCCESS=0
SKIP=0
FAIL=0

for sql_file in "${EXEC_FILES[@]}"; do
    FILE_PATH="$SQL_DIR/$sql_file"

    if [ ! -f "$FILE_PATH" ]; then
        echo "   ❌ $sql_file 文件不存在，跳过"
        FAIL=$((FAIL + 1))
        continue
    fi

    # 计算文件 MD5
    CHECKSUM=$(md5sum "$FILE_PATH" | awk '{print $1}')

    # 检查是否已执行过相同 checksum
    ALREADY=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM \`_sql_exec_log\` WHERE file_name='$sql_file' AND checksum='$CHECKSUM' AND status='success';" 2>/dev/null || echo "0")

    if [ "$ALREADY" -gt 0 ] 2>/dev/null; then
        echo "   ⏭️  $sql_file 已执行过（checksum: ${CHECKSUM:0:8}...），跳过"
        SKIP=$((SKIP + 1))
        continue
    fi

    # 执行 SQL
    echo "   📥 执行 $sql_file ..."
    ERROR_OUTPUT=$(mktemp)
    if $MYSQL_CMD < "$FILE_PATH" 2>"$ERROR_OUTPUT"; then
        # 记录成功
        $MYSQL_CMD -e "INSERT INTO \`_sql_exec_log\` (file_name, checksum, status) VALUES ('$sql_file', '$CHECKSUM', 'success');" 2>/dev/null
        echo "   ✅ $sql_file 执行成功"
        SUCCESS=$((SUCCESS + 1))
    else
        ERR_MSG=$(cat "$ERROR_OUTPUT" | head -3 | tr "'" '"')
        # 记录失败
        $MYSQL_CMD -e "INSERT INTO \`_sql_exec_log\` (file_name, checksum, status, error_msg) VALUES ('$sql_file', '$CHECKSUM', 'failed', '$ERR_MSG');" 2>/dev/null || true
        echo "   ❌ $sql_file 执行失败: $ERR_MSG"
        FAIL=$((FAIL + 1))
    fi
    rm -f "$ERROR_OUTPUT"
done

# 汇总
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 执行完成"
echo "   成功: $SUCCESS   跳过: $SKIP   失败: $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
REMOTE_SCRIPT

# 替换占位符
sed -i.bak "s|__REMOTE_DIR__|$REMOTE_DIR|g" "$REMOTE_SCRIPT"
sed -i.bak "s|__EXEC_FILES__|${EXEC_FILES[*]}|g" "$REMOTE_SCRIPT"
rm -f "${REMOTE_SCRIPT}.bak"

# 上传并执行远程脚本
scp -q "$REMOTE_SCRIPT" "$REMOTE:/tmp/exec_sql_remote.sh"
ssh -q "$REMOTE" "bash /tmp/exec_sql_remote.sh; rm -f /tmp/exec_sql_remote.sh"

# 清理本地临时文件
rm -f "$REMOTE_SCRIPT"

echo ""
echo -e "${GREEN}✅ 全部完成！${NC}"