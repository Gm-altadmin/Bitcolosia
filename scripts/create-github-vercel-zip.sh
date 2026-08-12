#!/usr/bin/env bash
set -euo pipefail

# Creates a source-only archive that is safe to commit to GitHub.
# Usage: bash scripts/create-github-vercel-zip.sh [output_zip_path]

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_ZIP="${1:-${PROJECT_ROOT%/*}/bitcolosia-vercel-export.zip}"

mkdir -p "$(dirname "$OUTPUT_ZIP")"
rm -f "$OUTPUT_ZIP"

cd "$PROJECT_ROOT"
zip -qr "$OUTPUT_ZIP" . \
  -x ".git/*" \
  -x ".manus/*" \
  -x ".manus-logs/*" \
  -x ".webdev/*" \
  -x "node_modules/*" \
  -x "dist/*" \
  -x "build/*" \
  -x "coverage/*" \
  -x ".pnpm-store/*" \
  -x "client/public/__manus__/*" \
  -x ".project-config.json" \
  -x ".env" \
  -x ".env.*" \
  -x "*.log" \
  -x "*.sqlite" \
  -x "*.sqlite3" \
  -x "*.db" \
  -x "*.tsbuildinfo"

FORBIDDEN_PATTERN='(^|/)(\.git|\.manus|\.manus-logs|\.webdev|node_modules|dist|build|coverage|\.pnpm-store)(/|$)|(^|/)client/public/__manus__(/|$)|(^|/)\.env(\.|$)|(^|/)\.project-config\.json$|\.log$|\.sqlite3?$|\.db$'
if unzip -Z1 "$OUTPUT_ZIP" | grep -E "$FORBIDDEN_PATTERN" >/dev/null; then
  echo "Paket güvenlik denetiminden geçemedi: dışlanması gereken bir dosya bulundu." >&2
  exit 1
fi

echo "GitHub/Vercel kaynak paketi hazır: $OUTPUT_ZIP"
echo "Dosya sayısı: $(unzip -Z1 "$OUTPUT_ZIP" | wc -l | tr -d ' ')"
