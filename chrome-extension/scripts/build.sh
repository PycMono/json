#!/bin/bash
set -e

# =================================================================
# Chrome Extension 构建脚本
# 从主仓库同步 CSS/JS/i18n 资源，打包为可发布的 zip
#
# 用法：
#   sh scripts/build.sh          # 构建到 ../dist/chrome-extension/
#   sh scripts/build.sh --pack   # 构建并生成 zip
# =================================================================

# --- 配置 ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$EXT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist/chrome-extension"
APP_NAME="toolboxnova-chrome-extension"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔧 开始构建 Chrome 扩展...${NC}"
echo "   项目根目录: $PROJECT_ROOT"
echo "   扩展目录:   $EXT_DIR"
echo "   输出目录:   $DIST_DIR"
echo ""

# 1. 清空输出目录
echo -e "${YELLOW}🧹 清空输出目录...${NC}"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 2. 复制核心文件
echo -e "${YELLOW}📋 复制核心文件...${NC}"
cp "$EXT_DIR/manifest.json" "$DIST_DIR/"
cp "$EXT_DIR/background.js" "$DIST_DIR/"
cp "$EXT_DIR/content.js" "$DIST_DIR/"

# 3. 复制 popup / sidepanel / pages
echo -e "${YELLOW}📋 复制 UI 页面...${NC}"
cp -r "$EXT_DIR/popup" "$DIST_DIR/"
cp -r "$EXT_DIR/sidepanel" "$DIST_DIR/"
[ -d "$EXT_DIR/pages" ] && cp -r "$EXT_DIR/pages" "$DIST_DIR/"

# 3.5 生成 JSON tools bundle（合并 54 个 json-tool-*.js 为一个静态文件）
echo -e "${YELLOW}📦 生成 JSON tools bundle...${NC}"
BUNDLE_FILE="$DIST_DIR/pages/json-tools-bundle.js"
echo '// Auto-generated JSON tools bundle — DO NOT EDIT' > "$BUNDLE_FILE"
echo '' >> "$BUNDLE_FILE"
JS_BUNDLE_SRC="$PROJECT_ROOT/frontend/static/js"
for f in "$JS_BUNDLE_SRC"/json-tool-*.js; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    key=$(echo "$base" | sed 's/json-tool-\(.*\)\.js/\1/')
    echo "/* ── $key ── */" >> "$BUNDLE_FILE"
    echo "if(window.JT_TOOL==='$key'){" >> "$BUNDLE_FILE"
    cat "$f" >> "$BUNDLE_FILE"
    echo "" >> "$BUNDLE_FILE"
    echo "}" >> "$BUNDLE_FILE"
    echo "" >> "$BUNDLE_FILE"
done
BUNDLE_COUNT=$(grep -c "^if(window.JT_TOOL" "$BUNDLE_FILE")
echo "   ✅ Bundle 完成: $BUNDLE_COUNT 个工具"

# 4. 复制 i18n _locales（扩展自带）
echo -e "${YELLOW}📋 复制 i18n _locales...${NC}"
cp -r "$EXT_DIR/_locales" "$DIST_DIR/"

# 5. 同步主仓库的 CSS（100% 直接复用）
echo -e "${YELLOW}📦 同步 CSS（从主仓库 frontend/static/css/）...${NC}"
mkdir -p "$DIST_DIR/static/css"
CSS_SRC="$PROJECT_ROOT/frontend/static/css"
if [ -d "$CSS_SRC" ]; then
    # 只复制插件需要的 CSS 文件
    for css in main.css json-tools.css json-tool.css dev-tools.css \
        sms.css img-toolbox.css img-compress.css img-metadata.css img-resize.css \
        color-tools.css media-qr.css consent.css tools-editorial.css \
        ai-detector.css ai-humanizer.css ai-tool-page.css humanize.css detector.css; do
        [ -f "$CSS_SRC/$css" ] && cp "$CSS_SRC/$css" "$DIST_DIR/static/css/"
    done
    echo "   ✅ CSS 同步完成"
else
    echo "   ⚠️  未找到 $CSS_SRC"
fi

# 6. 同步主仓库的 JS（A 类工具 100% 直接复用）
echo -e "${YELLOW}📦 同步 JS（从主仓库 frontend/static/js/）...${NC}"
mkdir -p "$DIST_DIR/static/js"
JS_SRC="$PROJECT_ROOT/frontend/static/js"
if [ -d "$JS_SRC" ]; then
    # A 类：纯前端工具（离线可用）
    for js in \
        main.js theme.js \
        json-tools-core.js json-codegen-core.js json-home.js json-datasets.js datasets-meta.js \
        tools_base.js tools_case.js tools_regex.js tools_markdown.js tools_timestamp.js \
        dev-hash.js dev-base64.js dev-url-encode.js dev-ip.js dev-whois.js dev-word-counter.js \
        password.js password-checker.js \
        color-tools.js \
        img-compress.js img-compress-engine.js img-toolbox-engine.js \
        img-metadata-engine.js img-metadata-ui.js img-resize.js img-resize-engine.js img-resize-ui.js \
        media-qr-engine.js media-qr-ui.js media-qr-forms.js media-qr-frames.js media-qr-design.js \
        platform-icons.js; do
        [ -f "$JS_SRC/$js" ] && cp "$JS_SRC/$js" "$DIST_DIR/static/js/"
    done

    # JSON 工具子页面 JS（json-tool-*.js）
    for js in "$JS_SRC"/json-tool-*.js; do
        [ -f "$js" ] && cp "$js" "$DIST_DIR/static/js/"
    done

    # JSON learn articles
    if [ -d "$JS_SRC/learn-articles" ]; then
        mkdir -p "$DIST_DIR/static/js/learn-articles"
        cp "$JS_SRC"/learn-articles/*.js "$DIST_DIR/static/js/learn-articles/" 2>/dev/null || true
    fi

    # B 类：需要 API 的工具
    for js in \
        ai-detector.js ai-humanizer.js ai-compete.js ai-plagiarism.js \
        consent-engine.js; do
        [ -f "$JS_SRC/$js" ] && cp "$JS_SRC/$js" "$DIST_DIR/static/js/"
    done

    echo "   ✅ JS 同步完成"
else
    echo "   ⚠️  未找到 $JS_SRC"
fi

# 7. 同步主仓库的 i18n JSON（用于 JS 端加载，区别于 _locales）
echo -e "${YELLOW}📦 同步 i18n JSON（从主仓库 common/i18n/）...${NC}"
mkdir -p "$DIST_DIR/static/i18n"
I18N_SRC="$PROJECT_ROOT/common/i18n"
if [ -d "$I18N_SRC" ]; then
    for lang in en zh ja ko spa; do
        [ -d "$I18N_SRC/$lang" ] && cp -r "$I18N_SRC/$lang" "$DIST_DIR/static/i18n/"
    done
    echo "   ✅ i18n 同步完成"
fi

# 8. 复制静态数据集
echo -e "${YELLOW}📦 同步静态数据集...${NC}"
DATASETS_SRC="$PROJECT_ROOT/frontend/static/datasets"
if [ -d "$DATASETS_SRC" ]; then
    cp -r "$DATASETS_SRC" "$DIST_DIR/static/"
    echo "   ✅ 数据集同步完成"
fi

# 9. 复制扩展图标
echo -e "${YELLOW}📋 复制图标...${NC}"
mkdir -p "$DIST_DIR/static/img"
if [ -f "$EXT_DIR/static/img/icon-128.png" ]; then
    cp "$EXT_DIR/static/img/"icon-*.png "$DIST_DIR/static/img/"
    echo "   ✅ 图标复制完成"
else
    echo "   ⚠️  未找到图标，运行 sh scripts/generate-icons.sh 生成"
fi

# 9.5 复制 vendor 库（本地打包的 CDN 依赖，CSP 合规）
echo -e "${YELLOW}📦 复制 vendor 库...${NC}"
if [ -d "$EXT_DIR/static/vendor" ]; then
    cp -r "$EXT_DIR/static/vendor" "$DIST_DIR/static/"
    echo "   ✅ vendor 复制完成"
fi

# 10. 清理 macOS 影子文件
echo -e "${YELLOW}🧹 清理 macOS 影子文件...${NC}"
find "$DIST_DIR" -name "._*" -delete 2>/dev/null || true
find "$DIST_DIR" -name ".DS_Store" -delete 2>/dev/null || true

# 11. 验证关键文件
echo -e "${YELLOW}🔍 验证构建结果...${NC}"
MISSING=0
for f in manifest.json background.js content.js popup/popup.html; do
    if [ ! -f "$DIST_DIR/$f" ]; then
        echo "   ❌ 缺少: $f"
        MISSING=1
    fi
done
if [ "$MISSING" -eq 1 ]; then
    echo -e "${RED}❌ 关键文件缺失，构建失败${NC}"
    exit 1
fi
echo "   ✅ 所有关键文件验证通过"

# 12. 统计
FILE_COUNT=$(find "$DIST_DIR" -type f | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$DIST_DIR" | cut -f1)
echo ""
echo -e "${GREEN}✅ 构建完成！${NC}"
echo "   文件数: $FILE_COUNT"
echo "   总大小: $TOTAL_SIZE"
echo "   输出:   $DIST_DIR"

# 13. 可选：打包 zip
if [ "$1" = "--pack" ]; then
    echo ""
    echo -e "${YELLOW}📦 打包 zip...${NC}"
    ZIP_FILE="$PROJECT_ROOT/dist/${APP_NAME}.zip"
    cd "$DIST_DIR"
    COPYFILE_DISABLE=1 zip -r -q "$ZIP_FILE" .
    ZIP_SIZE=$(du -sh "$ZIP_FILE" | cut -f1)
    echo -e "${GREEN}✅ 打包完成！${NC}"
    echo "   文件: $ZIP_FILE"
    echo "   大小: $ZIP_SIZE"
fi
