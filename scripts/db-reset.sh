#!/usr/bin/env bash
# Xoa va tao lai (rong) database dev cua du an, de lan chay backend tiep theo
# (`cd backend && ./mvnw spring-boot:run`) de Flyway tu tao lai toan bo schema
# + du lieu nen (R__seed_*.sql) tu dau.
#
# CANH BAO: xoa TOAN BO du lieu hien co trong database (kho khoi phuc neu
# chua backup). Dung scripts/db-backup.sh truoc neu can giu lai du lieu dang co.
#
# Cach dung:
#   ./scripts/db-reset.sh          # co hoi xac nhan truoc khi xoa
#   ./scripts/db-reset.sh --yes    # bo qua xac nhan (dung trong script/CI)
#
# Doc bien ket noi tu backend/.env (uu tien) hoac .env o goc du an — xem
# scripts/_lib.sh. Mac dinh khop XAMPP: root / khong mat khau / localhost:3306.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

CONFIRM_FLAG="${1:-}"

echo "Sap XOA va TAO LAI database sau:"
echo_conn_summary
echo

if [ "$CONFIRM_FLAG" != "--yes" ]; then
  read -r -p "Go 'yes' de xac nhan xoa toan bo du lieu trong database tren: " answer
  if [ "$answer" != "yes" ]; then
    echo "Da huy, khong thay doi gi."
    exit 0
  fi
fi

echo "Dang xoa database '$DB_NAME' (neu co)..."
mysql_exec "DROP DATABASE IF EXISTS \`${DB_NAME}\`;"

echo "Dang tao lai database '$DB_NAME' (utf8mb4)..."
mysql_exec "CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

cat <<EOF

Xong. Database '$DB_NAME' hien dang rong.

Buoc tiep theo — chay backend MOT LAN de Flyway tu tao schema + du lieu nen:

    cd backend && ./mvnw spring-boot:run

Thay dong "Started ServiceOperationsApplication ... seconds" la Flyway da chay
xong toan bo migration + cac file R__seed_*.sql. Neu chi can du lieu nen ma
KHONG muon khoi dong lai backend, dung scripts/seed-demo-data.sh sau khi schema
da ton tai (vi du: schema cu, chi muon lam moi lai du lieu mau).
EOF
