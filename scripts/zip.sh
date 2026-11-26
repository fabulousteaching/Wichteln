#!/usr/bin/env bash
# Erstellt dist/Wichteln-Website.zip: Inhalt des Ordners web/ (ohne gespeicherte Runden),
# bereit zum Hochladen und Entpacken im Ordner der Website.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/Wichteln-Website.zip
git archive --format=zip -o dist/Wichteln-Website.zip HEAD:web
echo "✓ dist/Wichteln-Website.zip"
