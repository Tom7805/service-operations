#!/usr/bin/env bash
# Chay lai cac file du lieu nen (R__seed_*.sql) truc tiep bang mysql client,
# theo DUNG thu tu ten file (giong thu tu Flyway tu chay repeatable migration).
#
# Dung khi nao:
#   - Vua `git pull` va cac file R__seed_*.sql co thay doi, nhung ban khong
#     muon/khong the khoi dong lai backend ngay de Flyway tu ap dung.
#   - Muon dam bao du lieu nen (khach hang/nguoi dung/co hoi mau...) dung KHOP
#     voi develop, ma khong dung cham gi den schema hay du lieu ban tu tao.
#
# Script nay AN TOAN de chay lai nhieu lan: moi file seed deu dung
# `ON DUPLICATE KEY UPDATE` hoac `WHERE NOT EXISTS` — khong tao dong trung,
# khong dong/xoa du lieu ban da tu nhap (customer/contract/... ban tu test).
#
# YEU CAU: schema database phai ton tai san (da chay backend it nhat 1 lan de
# Flyway tao bang, hoac vua chay scripts/db-reset.sh + 1 lan backend truoc do).
# Neu chua co schema, script se bao loi ro rang thay vi chay sai.
#
# Cach dung:
#   ./scripts/seed-demo-data.sh

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

SEED_DIR="$REPO_ROOT/backend/src/main/resources/db/seed"

if [ ! -d "$SEED_DIR" ]; then
  echo "Khong tim thay thu muc seed: $SEED_DIR" >&2
  exit 1
fi

echo "Ap dung du lieu nen vao database sau:"
echo_conn_summary
echo

# Kiem tra schema da ton tai chua (bang flyway_schema_history la dau hieu chac
# chan nhat vi no chi duoc tao khi Flyway da chay it nhat 1 lan).
if ! mysql_exec "USE \`${DB_NAME}\`; SELECT 1 FROM flyway_schema_history LIMIT 1;" >/dev/null 2>&1; then
  cat <<EOF >&2
Database '$DB_NAME' chua co schema (chua tung chay Flyway). Chay backend 1 lan
truoc de tao schema day du:

    cd backend && ./mvnw spring-boot:run

roi chay lai script nay (hoac bo qua — backend da tu ap dung seed roi).
EOF
  exit 1
fi

# Thu tu chay = thu tu bang chu cai ten file, dung nhu Flyway chay repeatable
# migration — CAC FILE SEED PHU THUOC LAN NHAU THEO DUNG THU TU NAY (xem
# comment dau moi file trong backend/src/main/resources/db/seed/).
shopt -s nullglob
seed_files=("$SEED_DIR"/R__*.sql)
shopt -u nullglob

if [ ${#seed_files[@]} -eq 0 ]; then
  echo "Khong tim thay file seed nao trong $SEED_DIR" >&2
  exit 1
fi

IFS=$'\n' seed_files=($(sort <<<"${seed_files[*]}"))
unset IFS

for f in "${seed_files[@]}"; do
  echo "-> $(basename "$f")"
  mysql_source_file "$f"
done

echo
echo "Xong. Da ap dung ${#seed_files[@]} file du lieu nen."
