#!/usr/bin/env bash
# Ham dung chung cho cac script trong thu muc scripts/ (khong tu chay truc tiep).
# Doc bien ket noi DB tu backend/.env (uu tien) -> .env o goc du an -> gia tri
# mac dinh khop XAMPP (root, khong mat khau, localhost:3306, db service_operations).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Doc 1 bien tu file .env (dang KEY=VALUE, bo qua dong comment/rong).
# Tra ve rong neu file khong ton tai hoac khong co bien do.
_read_env_var() {
  local key="$1" file="$2"
  [ -f "$file" ] || return 0
  grep -E "^${key}=" "$file" 2>/dev/null | tail -n 1 | cut -d '=' -f 2- | sed -e 's/^"//' -e 's/"$//' || true
}

# Doc 1 bien: uu tien backend/.env, roi .env o goc, roi bien moi truong dang co san.
env_var() {
  local key="$1" default_value="${2:-}"
  local value
  value="$(_read_env_var "$key" "$REPO_ROOT/backend/.env")"
  if [ -z "$value" ]; then
    value="$(_read_env_var "$key" "$REPO_ROOT/.env")"
  fi
  if [ -z "$value" ]; then
    value="${!key:-}"
  fi
  if [ -z "$value" ]; then
    value="$default_value"
  fi
  printf '%s' "$value"
}

DB_HOST="$(env_var DB_HOST localhost)"
DB_PORT="$(env_var DB_PORT 3306)"
DB_NAME="$(env_var MYSQL_DATABASE service_operations)"
DB_USERNAME="$(env_var DB_USERNAME root)"
DB_PASSWORD="$(env_var DB_PASSWORD "")"

# DB_URL (neu co) ghi de host/port/dbname suy ra tu jdbc:mysql://host:port/dbname
DB_URL_RAW="$(env_var DB_URL "")"
if [ -n "$DB_URL_RAW" ]; then
  _hostport_db="${DB_URL_RAW#jdbc:mysql://}"
  _hostport_db="${_hostport_db%%\?*}"
  _hostport="${_hostport_db%%/*}"
  _dbname="${_hostport_db#*/}"
  [ -n "$_hostport" ] && DB_HOST="${_hostport%%:*}"
  [ -n "$_hostport" ] && DB_PORT="${_hostport##*:}"
  [ -n "$_dbname" ] && DB_NAME="$_dbname"
fi

# Tim client mysql/mysqldump: uu tien PATH, sau do cac vi tri cai dat pho bien
# tren Windows (MySQL Installer, XAMPP) vi hai chuong trinh nay thuong khong
# tu them vao PATH.
_find_mysql_bin() {
  local bin_name="$1"
  if command -v "$bin_name" >/dev/null 2>&1; then
    command -v "$bin_name"
    return 0
  fi
  local candidates=(
    "/c/Program Files/MySQL/MySQL Server 8.0/bin/${bin_name}.exe"
    "/c/xampp/mysql/bin/${bin_name}.exe"
  )
  local c
  for c in "${candidates[@]}"; do
    if [ -x "$c" ]; then
      printf '%s' "$c"
      return 0
    fi
  done
  return 1
}

MYSQL_BIN="$(_find_mysql_bin mysql || true)"
MYSQLDUMP_BIN="$(_find_mysql_bin mysqldump || true)"

require_mysql_bin() {
  if [ -z "$MYSQL_BIN" ]; then
    echo "Khong tim thay lenh 'mysql'. Cai MySQL client (XAMPP hoac MySQL Installer)" >&2
    echo "hoac them thu muc bin cua no vao PATH roi chay lai." >&2
    exit 1
  fi
}

require_mysqldump_bin() {
  if [ -z "$MYSQLDUMP_BIN" ]; then
    echo "Khong tim thay lenh 'mysqldump'. Cai MySQL client (XAMPP hoac MySQL Installer)" >&2
    echo "hoac them thu muc bin cua no vao PATH roi chay lai." >&2
    exit 1
  fi
}

# QUAN TRONG: luon ep --default-character-set=utf8mb4. Neu khong, mysql client
# tu doi charset ket noi theo locale cua terminal (vi du cp1252 tren Windows)
# va se GHI SAI cac ten co dau (vd "Do Thi Mai" -> chu la mojibake) ngay ca khi
# file .sql va cot DB deu la utf8mb4 dung.

# Chay 1 cau lenh SQL (khong phai file) tren server (khong chon san database --
# dung cho DROP/CREATE DATABASE).
mysql_exec() {
  require_mysql_bin
  "$MYSQL_BIN" --default-character-set=utf8mb4 -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" ${DB_PASSWORD:+-p"$DB_PASSWORD"} -e "$1"
}

# Chay 1 file .sql vao dung database cua du an.
mysql_source_file() {
  require_mysql_bin
  "$MYSQL_BIN" --default-character-set=utf8mb4 -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" < "$1"
}

echo_conn_summary() {
  echo "  Host/port : $DB_HOST:$DB_PORT"
  echo "  Database  : $DB_NAME"
  echo "  User      : $DB_USERNAME"
}
