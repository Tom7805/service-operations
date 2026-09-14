#!/usr/bin/env bash
# Xuat (dump) toan bo database dev hien tai ra 1 file nen trong thu muc
# backups/ o goc du an (da khai bao trong .gitignore — KHONG bao gio bi commit
# nham). Dung truoc khi chay scripts/db-reset.sh hoac lam gi rui ro voi du
# lieu local dang co.
#
# Cach dung:
#   ./scripts/db-backup.sh              # dat ten file theo thoi gian hien tai
#   ./scripts/db-backup.sh ten-file.sql # dat ten file tuy chon (se tu them .gz)

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

require_mysqldump_bin

BACKUP_DIR="$REPO_ROOT/backups"
mkdir -p "$BACKUP_DIR"

if [ -n "${1:-}" ]; then
  base_name="${1%.sql}"
  base_name="${base_name%.gz}"
else
  base_name="${DB_NAME}_$(date +%Y%m%d_%H%M%S)"
fi

out_file="$BACKUP_DIR/${base_name}.sql.gz"

echo "Dang dump database sau:"
echo_conn_summary
echo "  File dich  : $out_file"
echo

"$MYSQLDUMP_BIN" -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" ${DB_PASSWORD:+-p"$DB_PASSWORD"} \
  --single-transaction --routines --triggers --column-statistics=0 \
  "$DB_NAME" | gzip -9 > "$out_file"

echo "Xong. Backup luu tai: $out_file"
echo "Khoi phuc lai bang: ./scripts/db-restore.sh \"$out_file\""
