#!/bin/bash
set -e

# =================================================================
# Chrome Extension 一键发布到 Chrome Web Store
#
# 前置条件：
#   1. 在 Google Cloud Console 创建项目，启用 Chrome Web Store API
#   2. 创建 OAuth2 凭证，获取 refresh_token
#   3. 设置环境变量（见下方配置区）
#
# 用法：
#   sh scripts/deploy.sh              # 构建 + 上传 + 发布（默认 trusted testers）
#   sh scripts/deploy.sh --public     # 构建 + 上传 + 发布到所有用户
#   sh scripts/deploy.sh --skip-build # 跳过构建，直接上传已有的 zip
# =================================================================

# --- 配置区 ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$EXT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist/chrome-extension"
ZIP_FILE="$PROJECT_ROOT/dist/toolboxnova-chrome-extension.zip"
APP_NAME="toolboxnova-chrome-extension"

# Chrome Web Store API 配置（通过环境变量注入）
# 获取方式见 README.md 的「发布配置」章节
CLIENT_ID="${CW_CLIENT_ID:-}"
CLIENT_SECRET="${CW_CLIENT_SECRET:-}"
REFRESH_TOKEN="${CW_REFRESH_TOKEN:-}"
APP_ID="${CW_APP_ID:-}"         # Chrome Web Store 中的 Extension ID

# 发布目标：trustedTesters | default（所有用户）
PUBLISH_TARGET="trustedTesters"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# --- 参数解析 ---
SKIP_BUILD=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --public)
            PUBLISH_TARGET="default"
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        *)
            echo -e "${RED}未知参数: $1${NC}"
            exit 1
            ;;
    esac
done

# =================================================================
# 前置检查
# =================================================================
if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$REFRESH_TOKEN" ] || [ -z "$APP_ID" ]; then
    echo -e "${RED}❌ 缺少 Chrome Web Store API 配置！${NC}"
    echo ""
    echo "请设置以下环境变量："
    echo "  export CW_CLIENT_ID='your_client_id'"
    echo "  export CW_CLIENT_SECRET='your_client_secret'"
    echo "  export CW_REFRESH_TOKEN='your_refresh_token'"
    echo "  export CW_APP_ID='your_extension_id'"
    echo ""
    echo "获取方式见 chrome-extension/README.md 的「发布配置」章节"
    exit 1
fi

echo -e "${GREEN}🚀 开始部署 Chrome 扩展到 Chrome Web Store...${NC}"
echo ""

# =================================================================
# 1. 构建
# =================================================================
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}📦 步骤 1/4：构建扩展...${NC}"
    sh "$SCRIPT_DIR/build.sh" --pack
    echo ""
else
    echo -e "${YELLOW}📦 步骤 1/4：跳过构建，使用已有 zip${NC}"
    if [ ! -f "$ZIP_FILE" ]; then
        echo -e "${RED}❌ zip 文件不存在: $ZIP_FILE${NC}"
        echo "   请先运行 sh scripts/build.sh --pack"
        exit 1
    fi
fi

# =================================================================
# 2. 获取 Access Token
# =================================================================
echo -e "${YELLOW}🔐 步骤 2/4：获取 Access Token...${NC}"
TOKEN_RESP=$(curl -s -X POST \
    "https://oauth2.googleapis.com/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=$CLIENT_ID" \
    -d "client_secret=$CLIENT_SECRET" \
    -d "refresh_token=$REFRESH_TOKEN" \
    -d "grant_type=refresh_token")

ACCESS_TOKEN=$(echo "$TOKEN_RESP" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ 获取 Access Token 失败！${NC}"
    echo "   响应: $TOKEN_RESP"
    echo ""
    echo "   可能原因："
    echo "   1. refresh_token 已过期，需要重新授权"
    echo "   2. client_id / client_secret 不正确"
    exit 1
fi
echo "   ✅ Access Token 获取成功"

# =================================================================
# 3. 上传 zip 到 Chrome Web Store
# =================================================================
echo -e "${YELLOW}📤 步骤 3/4：上传扩展到 Chrome Web Store...${NC}"
UPLOAD_RESP=$(curl -s -X PUT \
    "https://www.googleapis.com/upload/chromewebstore/v1.1/items/$APP_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "x-goog-api-version: 2" \
    -T "$ZIP_FILE")

UPLOAD_STATUS=$(echo "$UPLOAD_RESP" | grep -o '"uploadState":"[^"]*"' | cut -d'"' -f4)
if [ "$UPLOAD_STATUS" != "SUCCESS" ]; then
    echo -e "${RED}❌ 上传失败！${NC}"
    echo "   响应: $UPLOAD_RESP"
    exit 1
fi
echo "   ✅ 上传成功"

# =================================================================
# 4. 发布
# =================================================================
echo -e "${YELLOW}📢 步骤 4/4：发布扩展（目标: $PUBLISH_TARGET）...${NC}"
PUBLISH_RESP=$(curl -s -X POST \
    "https://www.googleapis.com/chromewebstore/v1.1/items/$APP_ID/publish?publishTarget=$PUBLISH_TARGET" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "x-goog-api-version: 2" \
    -H "Content-Length: 0")

PUBLISH_STATUS=$(echo "$PUBLISH_RESP" | grep -o '"status":\["[^"]*"\]' | head -1 | cut -d'"' -f4)
if [ "$PUBLISH_STATUS" = "OK" ]; then
    echo "   ✅ 发布成功！"
else
    echo "   ⚠️  发布状态: $PUBLISH_STATUS"
    echo "   响应: $PUBLISH_RESP"
    echo ""
    echo "   注意：首次发布需要 Google 人工审核，通常需要 1-3 个工作日"
fi

# =================================================================
# 完成
# =================================================================
ZIP_SIZE=$(du -sh "$ZIP_FILE" | cut -f1)
echo ""
echo -e "${GREEN}------------------------------------------------${NC}"
echo -e "${GREEN}✅ Chrome 扩展部署完成！${NC}"
echo "   扩展 ID: $APP_ID"
echo "   包大小:  $ZIP_SIZE"
echo "   发布到:  $([ "$PUBLISH_TARGET" = "default" ] && echo "所有用户" || echo "Trusted Testers")"
echo "   管理面板: https://chrome.google.com/webstore/devconsole"
echo -e "${GREEN}------------------------------------------------${NC}"

# 提醒版本号
VERSION=$(grep '"version"' "$DIST_DIR/manifest.json" | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
echo ""
echo "💡 当前版本: $VERSION"
echo "   发布新版本前，请更新 chrome-extension/manifest.json 中的 version 字段"
