# Bien moi truong (Environment Variables)

Tat ca bien moi truong duoc khai bao mau trong `.env.example` (root) va `frontend/.env.example`.
Khi setup local, copy 2 file nay thanh `.env` va `frontend/.env` roi dien gia tri thuc te.
File `.env` / `frontend/.env` KHONG duoc commit len Git (da khai bao trong `.gitignore`).

## Root `.env` (dung chung cho docker-compose va backend)

| Bien | Mo ta | Gia tri mac dinh (dev) |
|---|---|---|
| `MYSQL_DATABASE` | Ten database | `service_operations` |
| `MYSQL_USER` | User ket noi DB (khong phai root) | `service_ops_user` |
| `MYSQL_PASSWORD` | Mat khau cua `MYSQL_USER` | `changeme` |
| `MYSQL_ROOT_PASSWORD` | Mat khau root MySQL | `changeme_root` |
| `MYSQL_PORT` | Port MySQL expose ra host | `3306` |
| `SPRING_PROFILES_ACTIVE` | Profile Spring dang chay | `dev` |
| `DB_URL` | JDBC URL backend ket noi toi DB | `jdbc:mysql://localhost:3306/service_operations` |
| `DB_USERNAME` | Username backend dung de ket noi DB | `root` (XAMPP mac dinh) hoac `service_ops_user` (Docker) |
| `DB_PASSWORD` | Password backend dung de ket noi DB | Rong (XAMPP mac dinh) hoac `changeme` (Docker) |
| `JWT_SECRET` | Chuoi bi mat ky JWT (>= 32 ky tu, random) | *(tu tao)* |
| `JWT_EXPIRATION` | Thoi gian song cua access token (ms) | `86400000` (24h) |
| `SERVER_PORT` | Port backend Spring Boot lang nghe | `8080` |
| `VITE_API_BASE_URL` | Base URL API ma frontend goi toi | `http://localhost:8080/api/v1` |

## `frontend/.env`

| Bien | Mo ta | Gia tri mac dinh (dev) |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL cua backend API | `http://localhost:8080/api/v1` |

## Luu y

- Khong bao gio commit gia tri `JWT_SECRET`, mat khau DB that len Git hay chia se qua chat/email khong ma hoa.
- Moi thanh vien tu sinh `JWT_SECRET` rieng cho may local (co the dung `openssl rand -base64 48`).
- Khi deploy staging/production, bien moi truong duoc cau hinh qua CI/CD secrets, khong dung file `.env`.
