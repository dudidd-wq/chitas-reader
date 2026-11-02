#!/bin/sh
# Downloads the third-party inputs of tools/gloss-xcheck.py into /tmp/xchk (not committed: large, and used only for checking).
set -e
mkdir -p /tmp/xchk && cd /tmp/xchk
S='https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT'
curl -sfL -o tahot1.txt "$S/TAHOT%20Gen-Deu%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt"
curl -sfL -o tahot3.txt "$S/TAHOT%20Job-Sng%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt"
curl -sfL -o he.jsonl 'https://kaikki.org/dictionary/Hebrew/kaikki.org-dictionary-Hebrew.jsonl'
node "$(dirname "$0")/fetch-jps.mjs"
python3 -c "import nltk; nltk.download('wordnet', quiet=True)"
