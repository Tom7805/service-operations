#!/usr/bin/env bash
# Khoi phuc database dev tu 1 file backup do scripts/db-backup.sh tao ra
# (.sql hoac .sql.gz). GHI DE toan bo du lieu dang co trong database dich.
#
# Cach dung:
#   ./scripts/db-restore.sh backups/service_operations_20260910_120000.sql.gz
#   ./scripts/db-restore.sh                # tu dong chon file moi nhat trong backups/

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

require_mysql_bin

BACKUP_DIR="$REPO_ROOT/backups"
input_file="${1:-}"

if [ -z "$input_file" ]; then
  input_file="$(ls -t "$BACKUP_DIR"/*.sql.gz "$BACKUP_DIR"/*.sql 2>/dev/null | head -n 1 || true)"
  if [ -z "$input_file" ]; then
    echo "Khong tim thay file backup nao trong $BACKUP_DIR va cung khong duoc" >&2
    echo "truyen duong dan file. Cach dung: ./scripts/db-restore.sh <file>" >&2
    exit 1
  fi
  echo "Khong truyen file — dung file moi nhat: $input_file"
fi

if [ ! -f "$input_file" ]; then
  echo "Khong tim thay file: $input_file" >&2
  exit 1
fi

echo
echo "Sap GHI DE toan bo database sau bang noi dung file '$input_file':"
echo_conn_summary
echo

read -r -p "Go 'yes' de xac nhan: " answer
if [ "$answer" != "yes" ]; then
  echo "Da huy, khong thay doi gi."
  exit 0
fi

echo "Dang tao database '$DB_NAME' neu chua co..."
mysql_exec "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Dang khoi phuc du lieu..."
case "$input_file" in
  *.gz)
    gunzip -c "$input_file" | mysql_source_file /dev/stdin
    ;;
  *)
    mysql_source_file "$input_file"
    ;;
esac

echo
echo "Xong. Database '$DB_NAME' da duoc khoi phuc tu: $input_file"
