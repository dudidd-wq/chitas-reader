#!/bin/sh
# Download the Chassidut Behirah PDFs (public Google Drive links from chassidutbehirah.com)
# into $CB_DIR/pdf (default /tmp/cbh). The PDFs are not committed to the repository.
set -e
I="$(cd "$(dirname "$0")" && pwd)/index.tsv"; [ -f "$I" ] || { echo "no index.tsv" >&2; exit 1; }
D="${CB_DIR:-/tmp/cbh}/pdf"; mkdir -p "$D"
awk -F"\t" '{print $1, $4, ($5 == "" ? "-" : $5), $6}' "$I" | while read -r n id rk size; do
  f="$D/$n.pdf"
  [ -s "$f" ] && [ "$(wc -c < "$f")" -eq "$size" ] && continue
  curl -sSL -o "$f" "https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t$([ "$rk" = - ] || echo "&resourcekey=$rk")"
  [ "$(wc -c < "$f")" -eq "$size" ] || { echo "size mismatch: $n" >&2; exit 1; }
done
echo ok
