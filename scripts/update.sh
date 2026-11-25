#!/usr/bin/env bash
#
# Aktualisiert das Wichtel-Tool auf die neueste Version von GitHub.
# Die Wichtelrunden (Ordner data) und die Einstellungen (.env) bleiben unverändert.
#
# Aufruf im Ordner des Tools, z. B. in der SSH-Konsole von Infomaniak:
#   cd ~/sites/wichteln.deinedomain.ch && curl -fsSL https://raw.githubusercontent.com/fabulousteaching/Instamatisierung/claude/wichtel-drawing-tool-uqunr4/wichtel/scripts/update.sh | bash
#
# Danach das Tool neu starten (bei Infomaniak im Manager auf "Neu starten").

set -euo pipefail

REPO="fabulousteaching/Instamatisierung"
BRANCH="${WICHTEL_BRANCH:-claude/wichtel-drawing-tool-uqunr4}"
APP_DIR="$(pwd)"

if [ ! -f "$APP_DIR/package.json" ] || ! grep -q '"name": "wichtel"' "$APP_DIR/package.json"; then
  echo "✗ Hier liegt kein Wichtel-Tool ($APP_DIR)."
  echo "  Bitte zuerst in den Ordner des Tools wechseln (cd …) und erneut starten."
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Lade die neueste Version herunter …"
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" | tar -xz -C "$TMP" --strip-components=1

SRC="$TMP/wichtel"
if [ ! -f "$SRC/package.json" ] || [ ! -d "$SRC/src" ]; then
  echo "✗ Download unvollständig – nichts wurde verändert."
  exit 1
fi

echo "→ Ersetze Programmdateien (.env und data bleiben unverändert) …"
for item in src public scripts package.json package-lock.json README.md Dockerfile; do
  if [ -e "$SRC/$item" ]; then
    rm -rf "${APP_DIR:?}/$item"
    cp -R "$SRC/$item" "$APP_DIR/$item"
  fi
done

echo "→ Installiere Abhängigkeiten …"
npm install --omit=dev --no-audit --no-fund --loglevel=error

echo ""
echo "✓ Fertig! Jetzt das Tool neu starten (Infomaniak-Manager → „Neu starten“)."
