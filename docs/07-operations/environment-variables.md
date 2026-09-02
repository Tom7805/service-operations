# Bien moi truong (Environment Variables)

## Hai file `.env` khac nhau — dung DUNG VI TRI theo cach ban chay

Du an co **hai kich ban chay backend**, va moi kich ban doc file `.env` tu
**mot vi tri khac nhau**. Nham vi tri la nguyen nhan pho bien nhat khien mot
thanh vien sua `.env` ma khong thay tac dung gi — vi backend dang doc file
`.env` o cho khac.

| Ban chay backend the nao? | Doc `.env` o dau | File mau |
|---|---|---|
| `docker compose up` (tu thu muc goc) | **`.env` o thu muc goc** — Docker Compose tu doc de thay vao `docker-compose.yml` | [`.env.example`](../../.env.example) |
| `cd backend && ./mvnw spring-boot:run` (chay Maven truc tiep, khong qua Docker) | **`backend/.env`** — thu vien `spring-dotenv` tu doc file nay tu thu muc lam viec | [`backend/.env.example`](../../backend/.env.example) |

**Neu ban chay Maven truc tiep** (da so thanh vien lam vay de co hot reload
nhanh o Buoc 4 trong README) thi phai copy:

```bash
cp backend/.env.example backend/.env
```

Copy `.env.example` o goc thoi la **khong du** — no chi anh huong toi Docker
Compose, khong anh huong gi toi backend chay bang Maven.

Ca hai file KHONG duoc commit len Git (`*.env` da khai bao trong `.gitignore`
o thu muc goc).

## Bien dung chung (CSDL, JWT...)

| Bien | Mo ta | Gia tri mac dinh (dev) |
|---|---|---|
| `MYSQL_DATABASE` | Ten database (chi Docker Compose dung) | `service_operations` |
| `MYSQL_USER` | User ket noi DB, khong phai root (chi Docker Compose dung) | `service_ops_user` |
| `MYSQL_PASSWORD` | Mat khau cua `MYSQL_USER` (chi Docker Compose dung) | `changeme` |
| `MYSQL_ROOT_PASSWORD` | Mat khau root MySQL (chi Docker Compose dung) | `changeme_root` |
| `MYSQL_PORT` | Port MySQL expose ra host (chi Docker Compose dung) | `3306` |
| `SPRING_PROFILES_ACTIVE` | Profile Spring dang chay | `dev` |
| `DB_URL` | JDBC URL backend ket noi toi DB | `jdbc:mysql://localhost:3306/service_operations` |
| `DB_USERNAME` | Username backend dung de ket noi DB | `root` (XAMPP mac dinh) hoac `service_ops_user` (Docker) |
| `DB_PASSWORD` | Password backend dung de ket noi DB | Rong (XAMPP mac dinh) hoac `changeme` (Docker) |
| `JWT_SECRET` | Chuoi bi mat ky JWT (>= 32 ky tu, random) | *(tu tao)* |
| `JWT_EXPIRATION` | Thoi gian song cua access token (ms) | `86400000` (24h) |
| `SERVER_PORT` | Port backend Spring Boot lang nghe | `8080` |
| `FRONTEND_BASE_URL` | Goc dia chi frontend, dat vao lien ket khoi phuc mat khau | `http://localhost:5173` |
| `VITE_API_BASE_URL` | Base URL API ma frontend goi toi | `http://localhost:8080/api/v1` |

## Thu dien tu (khoi phuc mat khau) — `NCL-01-CN-008`

**TUY CHON o profile `dev`, BAT BUOC o profile `prod`** (thieu thi backend
dung khoi dong, xem `PasswordResetMailRequiredConfig`).

He thong **khong con la cong tac bat/tat toan cuc**. Tra ban ghi MX cua ten
mien qua DNS truoc khi gui (`DomainReachabilityChecker`), roi tu dong quyet
dinh THEO TUNG DIA CHI EMAIL — khong can doi cau hinh qua lai giua "may dev"
va "gui that":

- Da khai bao `SMTP_HOST`, gui toi mot ten mien **co ban ghi MX** (`@gmail.com`,
  `@outlook.com`, domain cong ty that...) → **gui thu that** qua SMTP.
- Cung voi `SMTP_HOST` do, gui toi mot ten mien **khong co ban ghi MX** (cac tai
  khoan mau `@service-operations.local`) → **tu dong ghi ra log**, khong ton
  mot lan goi SMTP nao.
- Chua khai bao `SMTP_HOST` (de trong) → **moi** dia chi deu ghi ra log, du la
  mau hay that.

| Bien | Mo ta | Mac dinh |
|---|---|---|
| `SMTP_HOST` | Dia chi may chu SMTP. Rong = luon ghi log, khong gui gi | *(rong)* |
| `SMTP_PORT` | Cong SMTP | `587` |
| `SMTP_USERNAME` | Tai khoan dang nhap SMTP | *(rong)* |
| `SMTP_PASSWORD` | Mat khau/App Password cua tai khoan tren | *(rong)* |
| `SMTP_AUTH` | Bat xac thuc SMTP | `true` |
| `SMTP_STARTTLS` | Bat STARTTLS | `true` |
| `MAIL_FROM` | Dia chi hien trong truong "Tu" cua thu gui di | *(rong)* |
| `PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS` | So lan goi `/auth/forgot-password` toi da moi cua so, tinh theo CA IP lan email | `5` |
| `PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS` | Do dai cua so gioi han tan suat (giay) | `900` (15 phut) |

### Lay ma khoi phuc khi chua cau hinh SMTP (mac dinh — du dung hang ngay)

Khong can lam gi ca. Bam "Quen mat khau" tren giao dien roi doc ma trong log:

```bash
# Chay backend truc tiep: xem thang cua so console dang chay `./mvnw spring-boot:run`
# Chay qua Docker:
docker logs service-ops-backend 2>&1 | grep AUDIT_MOCK_EMAIL | tail -1
```

### Muon thu gui thu that tren may minh (tuy chon, khong bat buoc)

**Moi thanh vien tu dung Gmail CUA CHINH MINH**, khong dung chung mot tai
khoan voi nguoi khac trong team — day la quyet dinh cua team, xem ly do o muc
"Luu y" ben duoi.

1. `myaccount.google.com/security` → bat **Xac minh 2 buoc** (neu chua bat).
2. `myaccount.google.com/apppasswords` → tao mot mat khau ung dung moi, dat
   ten tuy y (vi du `Van hanh dich vu - <ten ban>`).
3. Dien chuoi 16 ky tu (bo dau cach) vao `SMTP_PASSWORD`, dia chi Gmail cua ban
   vao ca `SMTP_USERNAME` va `MAIL_FROM`.
4. Khoi dong lai backend. Bam "Quen mat khau" voi bat ky tai khoan nao co email
   that (Gmail, Outlook, domain cong ty...) — thu se toi hop thu that. Cac tai
   khoan mau `@service-operations.local` van tu dong roi vao log nhu binh
   thuong, khong bi anh huong.

## Luu y

- Khong bao gio commit gia tri `JWT_SECRET`, mat khau DB, hay `SMTP_PASSWORD` /
  App Password len Git hay chia se qua chat/email khong ma hoa.
- Moi thanh vien tu sinh `JWT_SECRET` rieng cho may local (co the dung
  `openssl rand -base64 48`).
- **App Password Gmail la bi mat CA NHAN.** Team da thong nhat: moi nguoi tu
  tao App Password cua chinh minh (khong dung chung mot tai khoan Gmail cho ca
  team) — vua tranh phai chia se secret qua lai, vua khong ai phu thuoc vao
  mot nguoi giu "chia khoa" gui thu chung. Neu ban thu hoi App Password cua
  minh (nen lam sau khi demo xong), tinh nang gui thu that tren may ban se
  ngung cho toi khi tao cai moi — khong anh huong nguoi khac trong team.
- Khi deploy staging/production, bien moi truong duoc cau hinh qua CI/CD
  secrets, khong dung file `.env`. O do bat buoc dung dich vu gui thu chuyen
  dung (SendGrid, AWS SES, Mailgun...) thay vi Gmail ca nhan — Gmail gioi han
  khoang 500 thu/ngay va co the bi khoa tam neu Google phat hien gui hang loat
  bat thuong tu mot tai khoan ca nhan.
