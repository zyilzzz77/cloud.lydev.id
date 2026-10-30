#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/lydev-cloud}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

timestamp="$(date +%Y-%m-%d-%H%M)"
target="$BACKUP_DIR/lydev-cloud-$timestamp.sql.gz"

pg_dump "$DATABASE_URL" | gzip > "$target"
find "$BACKUP_DIR" -type f -name 'lydev-cloud-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Backup written to $target"
