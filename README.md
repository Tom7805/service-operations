# Vận Hành Dịch Vụ (Service Operations)

Hệ thống quản lý vận hành dịch vụ: khách hàng, cơ hội kinh doanh, hợp đồng, dự án, chấm công, chi phí,
lợi nhuận, hóa đơn, nghiệm thu, báo cáo và cổng khách hàng.

- Backend: Java 17, Spring Boot 3.2, MySQL 8, Flyway
- Frontend: React 18, TypeScript, Vite, Redux Toolkit, Tailwind CSS
- Hạ tầng local: Docker Compose (MySQL, tùy chọn backend/frontend)

## 0. Checklist thiết lập lần đầu (dành cho thành viên mới kéo code về)

Chỉ cần làm **1 lần duy nhất** sau khi clone, không cần lặp lại ở những lần `git pull` sau:

- [ ] **Bước 1 — Tạo file `.env`:**
  ```bash
  cp .env.example .env
  cp frontend/.env.example frontend/.env
  ```
  Chỉ sửa tiếp nếu MySQL của bạn **không phải** root/không mật khẩu mặc định (xem Mục 2).

- [ ] **Bước 2 — Tạo database:** chạy 1 lần trong MySQL Workbench / phpMyAdmin:
  ```sql
  CREATE DATABASE IF NOT EXISTS service_operations
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

- [ ] **Bước 3 — Kiểm tra Windows/macOS Environment Variables:** nếu máy bạn từng chạy dự án cũ (ví dụ `QLSKDD`),
  mở `Edit environment variables for your account` và **xóa** các biến có thể trùng tên với dự án này nếu có:
  `DB_PASSWORD`, `DB_URL`, `DB_USERNAME`, `JWT_SECRET`, `JWT_EXPIRATION`, `SPRING_PROFILES_ACTIVE`, `CORS_ALLOWED_ORIGINS`.
  Các biến này sẽ **ghi đè lên `.env`** của dự án mới và gây lỗi kết nối DB rất khó hiểu nếu còn sót lại.

- [ ] **Bước 4 — Chạy thử backend** (xem chi tiết Mục 4 bên dưới):
  ```bash
  cd backend && ./mvnw spring-boot:run
  ```
  Thấy dòng `Started ServiceOperationsApplication ... seconds` là thành công.

> Nếu backend báo lỗi `Access denied for user 'root'` — quay lại Bước 1, sửa `DB_USERNAME`/`DB_PASSWORD` trong `.env`
> cho khớp mật khẩu MySQL thật của máy bạn.

## 1. Yêu cầu môi trường (bắt buộc giống nhau cho cả team)

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| JDK | **17** (LTS) | Khuyến dùng Temurin/Adoptium 17. Kiểm tra: `java -version` |
| Node.js | **20 LTS** | Khuyến dùng `nvm`. File `.nvmrc` đã có sẵn trong `frontend/` |
| MySQL | **8.0** | Chạy qua Docker (khuyến dùng) hoặc cài trực tiếp |
| Docker + Docker Compose | Bản mới nhất | Dùng để chạy MySQL (và tùy chọn full stack) |
| Git | Bản mới nhất | |
| Maven | Không cần cài riêng | Đã có Maven Wrapper (`mvnw` / `mvnw.cmd`) trong `backend/` |

> Không dùng bản JDK/Node khác phiên bản quy định ở trên để tránh lỗi không đồng nhất giữa các máy.

### IDE khuyến dùng

- Backend: IntelliJ IDEA (bật Annotation Processing cho Lombok) hoặc VS Code + Extension Pack for Java.
- Frontend: VS Code với các extension: ESLint, Prettier, Tailwind CSS IntelliSense.
- File `.editorconfig` đã cấu hình sẵn (indent, charset, line ending) — hầu hết IDE tự đọc file này.

## 2. Clone và cấu hình biến môi trường

```bash
git clone <repo-url>
cd service-operations

# copy file mẫu .env, điền giá trị thật (JWT_SECRET, mật khẩu DB...)
cp .env.example .env
cp frontend/.env.example frontend/.env
```

> **Nếu bạn chạy backend trực tiếp bằng Maven ở Bước 4** (đa số thành viên làm vậy để có hot reload
> nhanh), file `.env` ở gốc **không** ảnh hưởng gì tới backend — nó chỉ dùng cho Docker Compose.
> Cần thêm một bước: `cp backend/.env.example backend/.env`. Chi tiết vì sao có hai file khác vị trí:
> xem [docs/07-operations/environment-variables.md](docs/07-operations/environment-variables.md).

File `backend/.env.example` cũng chứa hướng dẫn cấu hình gửi mã khôi phục mật khẩu qua email thật
(tùy chọn, không bắt buộc để chạy dự án — mặc định mã hiện ra ngay trong console).

### 2.1. Cách thay thế — set biến môi trường thủ công trong máy (nếu không dùng `.env`)

Cách này hữu ích khi bạn chạy backend trực tiếp bằng `mvnw`/IDE mà không qua `.env` (ví dụ mật khẩu MySQL
của máy bạn không phải mặc định và bạn muốn set cố định, không cần sửa file mỗi lần pull code).

**Windows:**

1. Bấm Start, gõ **"Edit environment variables for your account"** rồi mở.
2. Ở bảng **User variables**, bấm **New...**.
3. Thêm lần lượt các biến cần thiết, ví dụ:
   - `DB_USERNAME` = `root`
   - `DB_PASSWORD` = *(mật khẩu MySQL thật của máy bạn)*
4. Bấm **OK** ở tất cả cửa sổ để lưu.
5. **Đóng và mở lại terminal/IDE** đang mở — biến môi trường chỉ có hiệu lực với terminal/process mở **sau** khi lưu.

**macOS / Linux:**

Thêm vào cuối file `~/.zshrc` (hoặc `~/.bashrc` nếu dùng bash):
```bash
export DB_USERNAME=root
export DB_PASSWORD=mat_khau_that_cua_ban
```
Sau đó chạy `source ~/.zshrc` (hoặc mở terminal mới) để áp dụng.

> **Biến môi trường set theo cách này sẽ ghi đè giá trị trong `.env`** — nên nếu backend chạy sai giá trị
> mong đợi dù đã sửa `.env`, hãy kiểm tra lại xem máy có đang set trùng tên biến ở cấp hệ điều hành không
> (xem thêm Bước 3 ở Mục 0).

## 3. Khởi động Database

### Cách 1 — Dùng XAMPP (khuyến dùng cho team, đơn giản nhất)

Nếu máy bạn đã cài XAMPP với cấu hình mặc định (user `root`, không mật khẩu, port 3306) thì **không cần sửa file `.env`** —
giá trị mặc định trong `.env.example` đã khớp sẵn. Chỉ cần:

1. Bật MySQL trong XAMPP Control Panel.
2. Tạo database bằng MySQL Workbench (hoặc phpMyAdmin):
   ```sql
   CREATE DATABASE IF NOT EXISTS service_operations
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

Flyway sẽ tự tạo bảng khi backend khởi động ở Bước 4 bên dưới, không cần tạo bảng bằng tay.

### Cách 2 — Dùng Docker Compose (nếu không cài XAMPP hoặc muốn môi trường tách biệt)

```bash
docker compose up -d mysql
docker compose ps   # kiểm tra container đã healthy
```

Sau đó sửa `.env`: đổi `DB_USERNAME`/`DB_PASSWORD` sang giá trị trong mục MySQL của `.env.example`
(`service_ops_user` / `changeme`) vì Docker MySQL không dùng tài khoản `root` không mật khẩu như XAMPP.

> Nếu máy đã có sẵn MySQL ở port 3306 (ví dụ đang chạy XAMPP), đổi port Docker MySQL bằng cách copy
> `docker-compose.override.yml.example` thành `docker-compose.override.yml` và sửa port tương ứng.

## 4. Chạy Backend (local, hot reload)

```bash
cd backend
./mvnw spring-boot:run
# Windows: mvnw.cmd spring-boot:run
```

Mặc định backend chạy tại `http://localhost:8080/api/v1`, Swagger UI tại `http://localhost:8080/api/v1/swagger-ui.html`.
Flyway sẽ tự động tạo/cập nhật schema DB khi khởi động (profile `dev`).

> Chạy kiểu này đọc cấu hình từ `backend/.env` (xem lưu ý ở Bước 2), không phải `.env` ở gốc dự án.

### Quên mật khẩu / khôi phục mật khẩu

Mặc định (không cần cấu hình gì), mã khôi phục 6 chữ số hiện thẳng trong cửa sổ console đang chạy
backend — tìm dòng có `AUDIT_MOCK_EMAIL`. Đủ dùng để code và kiểm thử hằng ngày.

Muốn thử gửi qua email thật trên máy bạn: mỗi người tự dùng **Gmail của chính mình**, không dùng
chung tài khoản với thành viên khác trong team. Các bước cụ thể nằm trong `backend/.env.example`.

## 5. Chạy Frontend (local, hot reload)

```bash
cd frontend
nvm use          # đảm bảo dùng Node 20 theo .nvmrc
npm install
npm run dev
```

Mặc định frontend chạy tại `http://localhost:5173`.

## 6. Chạy toàn bộ bằng Docker Compose (tùy chọn)

Nếu không muốn cài JDK/Node mà chỉ muốn chạy thử cả hệ thống:

```bash
docker compose --profile full-stack up -d --build
```

## 7. Các lệnh thường dùng khác

| Lệnh | Mục đích |
|---|---|
| `./mvnw test` (trong `backend/`) | Chạy unit/integration test backend |
| `npm run test` (trong `frontend/`) | Chạy unit test frontend (Vitest) |
| `npm run e2e` (trong `frontend/`) | Chạy e2e test (Playwright) |
| `npm run lint` (trong `frontend/`) | Kiểm tra ESLint |
| `docker compose down` | Tắt các container |
| `docker compose down -v` | Tắt container **và xóa volume DB** (mất dữ liệu local) |

Các script tiện ích hơn trong thư mục [scripts/](scripts/) (dev-up, db-reset, seed-demo-data...).

## 8. Quy ước làm việc chung

- Không commit file `.env`, `application-local.yml`, `docker-compose.override.yml` (đã bị ignore).
- Mọi thay đổi schema DB phải thêm migration mới trong `backend/src/main/resources/db/migration` (Flyway, không sửa migration cũ đã merge).
- Xem [CONTRIBUTING.md](CONTRIBUTING.md) để biết quy trình branch/commit/PR.
- Backlog và chi tiết từng Epic/User Story: xem [docs/01-backlog/](docs/01-backlog/).

## 9. Xử lý sự cố thường gặp

Xem [docs/07-operations/troubleshooting.md](docs/07-operations/troubleshooting.md).
