#!/bin/bash
# Generate Chrome extension icons from the project's SVG favicon
# Requires: cairosvg (pip install cairosvg) or librsvg (brew install librsvg)
#
# Usage: sh scripts/generate-icons.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$EXT_DIR/.." && pwd)"
SVG_SRC="$PROJECT_ROOT/frontend/static/img/favicon.svg"
OUT_DIR="$EXT_DIR/static/img"

mkdir -p "$OUT_DIR"

echo "🔧 Generating extension icons..."

# Method 1: Try rsvg-convert (best quality)
if command -v rsvg-convert &>/dev/null; then
  for size in 16 48 128; do
    rsvg-convert -w $size -h $size "$SVG_SRC" -o "$OUT_DIR/icon-${size}.png"
    echo "   ✅ icon-${size}.png (rsvg-convert)"
  done

# Method 2: Try cairosvg (Python)
elif command -v python3 &>/dev/null && python3 -c "import cairosvg" 2>/dev/null; then
  for size in 16 48 128; do
    python3 -c "import cairosvg; cairosvg.svg2png(url='$SVG_SRC', write_to='$OUT_DIR/icon-${size}.png', output_width=$size, output_height=$size)"
    echo "   ✅ icon-${size}.png (cairosvg)"
  done

# Method 3: Fallback - create simple PNG with sips (macOS built-in)
elif command -v sips &>/dev/null; then
  # sips can't read SVG, so create a temp PNG from a canvas approach
  echo "   ⚠️  rsvg-convert/cairosvg not found, using fallback method"
  # Create a basic colored square PNG using Python
  python3 << 'PYEOF'
import struct, zlib, os

def create_png(size, path):
    """Create a simple solid-color PNG (blue #1d4ed8)"""
    width, height = size, size
    # RGBA pixel: #1d4ed8 blue
    r, g, b = 0x1d, 0x4e, 0xd8

    def make_chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack('>I', len(data)) + c + crc

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = make_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter none
        for x in range(width):
            # Simple rounded square
            margin = size // 6
            if margin <= x < size - margin and margin <= y < size - margin:
                raw += bytes([r, g, b])
            else:
                raw += bytes([0, 0, 0, 0])[:3]

    idat = make_chunk(b'IDAT', zlib.compress(raw))
    iend = make_chunk(b'IEND', b'')

    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

for s in [16, 48, 128]:
    out = os.environ.get('OUT_DIR', '.') + f'/icon-{s}.png'
    create_png(s, out)
    print(f'   ✅ icon-{s}.png (fallback)')
PYEOF
  export OUT_DIR="$OUT_DIR"
else
  echo "   ❌ No SVG-to-PNG tool available"
  echo "   Install one of:"
  echo "     brew install librsvg      (macOS)"
  echo "     pip install cairosvg      (Python)"
  echo ""
  echo "   Or manually place these files in $OUT_DIR/:"
  echo "     icon-16.png (16x16)"
  echo "     icon-48.png (48x48)"
  echo "     icon-128.png (128x128)"
  exit 1
fi

echo ""
echo "✅ Icons generated in $OUT_DIR/"
ls -la "$OUT_DIR"/icon-*.png
