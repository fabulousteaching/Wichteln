#!/usr/bin/env bash
#
# Installiert bzw. aktualisiert das Wichtel-Tool (PHP-Website) mit der neuesten Version von GitHub.
# Die Wichtelrunden (Ordner data) und die Einstellungen (config.php) bleiben unverändert.
#
# Aufruf im Ordner der Website, z. B. in der SSH-Konsole von Infomaniak:
#   Erstinstallation:
#     cd ~/sites/wichteln.deinedomain.ch && curl -fsSL https://raw.githubusercontent.com/fabulousteaching/Wichteln/main/scripts/update.sh | bash -s -- --install
#   Update:
#     cd ~/sites/wichteln.deinedomain.ch && curl -fsSL https://raw.githubusercontent.com/fabulousteaching/Wichteln/main/scripts/update.sh | bash

set -euo pipefail

REPO="fabulousteaching/Wichteln"
BRANCH="${WICHTEL_BRANCH:-main}"
APP_DIR="$(pwd)"
INSTALL=0
[ "${1:-}" = "--install" ] && INSTALL=1

if [ ! -f "$APP_DIR/lib/wichtel.php" ] && [ "$INSTALL" -ne 1 ]; then
  echo "✗ Hier liegt (noch) kein Wichtel-Tool ($APP_DIR)."
  echo "  Für eine Erstinstallation den Befehl mit  bash -s -- --install  am Ende ausführen."
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Lade die neueste Version herunter …"
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" | tar -xz -C "$TMP" --strip-components=1

SRC="$TMP/web"
if [ ! -f "$SRC/api.php" ] || [ ! -f "$SRC/lib/wichtel.php" ]; then
  echo "✗ Download unvollständig – nichts wurde verändert."
  exit 1
fi

# Platzhalter-Startseite von Infomaniak entfernen (nur bei Erstinstallation)
if [ "$INSTALL" -eq 1 ] && [ ! -f "$APP_DIR/lib/wichtel.php" ]; then
  rm -f "$APP_DIR/index.php"
fi

echo "→ Ersetze Programmdateien (data und config.php bleiben unverändert) …"
shopt -s dotglob
for item in "$SRC"/*; do
  name="$(basename "$item")"
  case "$name" in
    data|config.php) continue ;;
  esac
  rm -rf "${APP_DIR:?}/$name"
  cp -R "$item" "$APP_DIR/$name"
done

mkdir -p "$APP_DIR/data"
for f in .htaccess index.html; do
  [ -e "$APP_DIR/data/$f" ] || cp "$SRC/data/$f" "$APP_DIR/data/$f"
done

echo ""
echo "✓ Fertig! Das Wichtel-Tool ist auf dem neuesten Stand."
