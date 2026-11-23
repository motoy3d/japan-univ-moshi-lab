#!/usr/bin/env bash
# 全受験者 × 全模試（＋手元にあれば本番の公開部分）の問題冊子を作る。
#   PY=python3 scripts/simulate/make_all_packets.sh <出力フォルダ> [模試ID ...]
# 本番データ（.local/reference/*.json）は著作権があるためコミットしない。出力フォルダもリポジトリの外を推奨。
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=${1:?出力フォルダ}; shift
PY=${PY:-python3}
mkdir -p "$OUT"
EXAMS=("$@")
[ ${#EXAMS[@]} -eq 0 ] && EXAMS=($(ls content/exams | sed 's/\.json$//'))
LIKE=content/exams/${EXAMS[0]}.json
for persona in content/personas/*.json; do
  p=$(basename "$persona" .json)
  for e in "${EXAMS[@]}"; do
    "$PY" scripts/simulate/make_packet.py "content/exams/$e.json" "$persona" "$OUT/$e--$p.md"
  done
  for ref in .local/reference/*.json; do
    [ -e "$ref" ] || continue
    r=$(basename "$ref" .json)
    "$PY" scripts/simulate/make_packet.py "$ref" "$persona" "$OUT/ref-$r--$p.md" --like "$LIKE"
  done
done
