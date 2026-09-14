# Hướng dẫn deploy lên server

## Sơ đồ luồng thực tế đang dùng

```
[Máy cá nhân]              [Git Repository]                    [Render + Aiven]
Local DB + Feature ──────► develop ──────► main ──────────────► Tự động deploy
(Tự do test/đập phá)       (Gộp code)      (Code ổn định nhất)   (Mentor xem bản này)
```

- `develop`: mỗi dev tự do code, test trên **DB local riêng** (Docker/XAMPP), không ảnh hưởng ai khác.
- `main`: luôn ở trạng thái chạy được. Mọi commit lên `main` khiến **Render tự deploy lại** (qua GitHub integration có sẵn của Render, không cần workflow CI/CD tự viết).
- Server thật: **Render** (backend Web Service Docker + frontend Static Site) + **Aiven** (MySQL managed, free tier) — không tự quản VPS. Backend chạy profile `dev` → Flyway tự áp migration + seed data mẫu, để mentor xem có dữ liệu ngay. DB trên Aiven hoàn toàn tách biệt với DB local của mọi dev.

> Lịch sử: ban đầu định dùng VPS tự SSH + `docker-compose.yml` + GitHub Actions, nhưng đổi sang Render/Aiven (miễn phí, không cần tự quản server) khi thực hiện. `docker/backend/Dockerfile`, `docker/frontend/Dockerfile`, `docker-compose.yml` vẫn giữ để chạy stack local bằng Docker nếu cần, nhưng **không dùng cho deploy server** nữa.

## 1. Hạ tầng đang chạy

| Thành phần | Nơi host | Ghi chú |
|---|---|---|
| Database | Aiven MySQL (free) | 1 service, database `defaultdb`, bắt buộc SSL (`?sslMode=REQUIRED`) |
| Backend | Render Web Service (Docker, free) | Build từ `docker/backend/Dockerfile`, Root Directory `backend` |
| Frontend | Render Static Site (free) | Build `npm run build` trong `frontend/`, publish `dist/` |

## 2. Deploy backend lên Render (Web Service, Docker)

1. **New** → **Web Service** → chọn repo `service-operations`, nhánh `main`.
2. Cấu hình quan trọng (Render tính Dockerfile Path theo gốc repo, KHÔNG theo Root Directory — dễ nhầm nhất khi mới làm):
   - **Root Directory**: để **trống**
   - **Dockerfile Path**: `docker/backend/Dockerfile`
   - **Docker Build Context Directory**: `backend`
   - **Instance Type**: **Free**
3. Environment Variables bắt buộc (thiếu 1 cái là lỗi ngay, dễ quên nhất là `DB_USERNAME`):
   ```
   SPRING_PROFILES_ACTIVE = dev
   DB_URL = jdbc:mysql://<host-aiven>:<port>/defaultdb?sslMode=REQUIRED
   DB_USERNAME = avnadmin
   DB_PASSWORD = <password Aiven>
   JWT_SECRET = <chuỗi ngẫu nhiên dài>
   JWT_EXPIRATION = 86400000
   FRONTEND_BASE_URL = <URL frontend Render, điền sau khi có ở bước 3>
   CORS_ALLOWED_ORIGINS = <URL frontend Render, điền sau khi có ở bước 3>
   ```
4. Deploy xong, lấy URL dạng `https://<tên-service>.onrender.com`.

## 3. Deploy frontend lên Render (Static Site)

1. **New** → **Static Site** → cùng repo, nhánh `main`.
2. Cấu hình:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. Environment Variables:
   ```
   VITE_API_BASE_URL = https://<backend-render-url>/api/v1
   ```
4. Deploy xong, lấy URL frontend — quay lại bước 2 điền `FRONTEND_BASE_URL` và `CORS_ALLOWED_ORIGINS` đúng URL này trên backend, **Save and rebuild** lại backend.

## 4. Dev vẫn test local thoải mái

- Chạy stack local bằng `scripts/dev-up.sh` hoặc `docker compose up` (dùng `docker-compose.yml` + Dockerfile ở gốc, chạy được độc lập với Render).
- Làm sạch + seed lại DB local bất cứ lúc nào: `scripts/db-reset.sh` rồi khởi động backend một lần (Flyway tự tạo schema + seed vì profile `dev` local có `classpath:db/seed`).
- Chỉ muốn refresh seed data (không đụng schema, không xoá dữ liệu tự nhập để test): `scripts/seed-demo-data.sh`.

DB server (Aiven) và DB local của từng dev là hai database vật lý khác nhau — không bao giờ đụng nhau.

## 5. Đặc thù gói Free cần lưu ý

- **Backend Render Free tự ngủ sau ~15 phút không hoạt động**, request đầu tiên sau khi ngủ có thể mất tới **50 giây**. Trước khi demo cho mentor, mở link backend trước vài phút để "đánh thức".
- Static Site (frontend) không có khái niệm ngủ/free tier giới hạn CPU — luôn phản hồi nhanh.
- Mỗi khi đổi domain (backend hoặc frontend đổi tên/URL), phải update **cả 2 chiều**: `FRONTEND_BASE_URL` + `CORS_ALLOWED_ORIGINS` bên backend, và `VITE_API_BASE_URL` bên frontend — quên 1 trong 2 là lỗi CORS / "Không thể kết nối tới máy chủ".

## 6. Checklist thao tác Git khi đưa code lên (rút ra từ thực tế đã gặp lỗi)

**Nhánh & merge:**
- Không code trực tiếp trên `develop`/`main` — tạo nhánh riêng, PR về `develop` khi xong.
- Trước khi merge `develop` → `main`: chạy `mvn compile` (backend) và `npm run build` (frontend) **trên máy local trước khi push**, không đợi Render báo lỗi mới biết.
- Có conflict khi merge: **đừng tự resolve bừa** khi không chắc — hỏi người biết rõ tính năng đó, nhất là các trường hợp 1 bên revert còn bên kia tiếp tục phát triển.
- **Sau khi merge xong, dù không còn dấu conflict, vẫn phải rà lại**: Git 3-way merge đôi khi âm thầm chọn sai bên ở những file không hiện conflict. Cách kiểm: `git diff --stat <nhánh-nguồn> <merge-commit>` để so sánh xem merge-commit có khớp hệt nhánh nguồn không.
- **Chạy test suite sau merge lớn, không chỉ build compile** — build sạch không đảm bảo không mất nội dung (vd file test bị rụng mất nhưng vẫn compile được).

**Trước khi deploy:**
- Checklist biến môi trường trên Render: `DB_URL`, `DB_USERNAME` (hay quên nhất), `DB_PASSWORD`, `JWT_SECRET`, `SPRING_PROFILES_ACTIVE`, `FRONTEND_BASE_URL`, `CORS_ALLOWED_ORIGINS`.
- Không để workflow CI/CD không còn dùng nằm im gây báo lỗi X đỏ trên GitHub (dọn dẹp `.github/workflows/` nếu đổi hướng deploy).

**Secrets:**
- Hễ lộ secret (password DB, API key...) ra bất kỳ đâu ngoài chỗ lưu chính thức (kể cả trong chat với AI assistant), **reset ngay**, không đợi "chắc không sao".
- `.env` không bao giờ commit — kiểm tra `git status` trước khi `git add -A` để chắc không dính file `.env` thật.

## 7. Kiểm tra sau khi deploy

- Backend: mở `https://<backend-url>/api/v1/swagger-ui.html` (có thể trả `401 UNAUTHORIZED` dạng JSON nếu route bị chặn — vẫn coi là backend sống, vì phản hồi đúng format).
- Frontend: mở `https://<frontend-url>`, đăng nhập bằng tài khoản có trong seed data, xác nhận thấy dữ liệu mẫu (khách hàng/dự án/nhân viên...).
- Trên Render, tab **Logs** của backend: xác nhận thấy Flyway chạy hết các migration (`V1`...`Vn`) và seed (`R__*`) không lỗi, dòng cuối có `Started ServiceOperationsApplication`.

## Troubleshooting nhanh

| Vấn đề | Nguyên nhân thường gặp |
|---|---|
| `Access denied for user 'root'@...` | Thiếu biến `DB_USERNAME` trên Render, backend rơi về giá trị mặc định `root` thay vì `avnadmin`. |
| `error: invalid local: resolve ... no such file or directory` khi build Docker | Root Directory + Dockerfile Path đặt sai — nhớ: Dockerfile Path tính từ **gốc repo**, không cộng dồn với Root Directory. |
| `DockerfilePath must not have '..'` | Đang để Root Directory khác rỗng mà Dockerfile Path lại dùng `../` — xoá Root Directory, dùng path đầy đủ từ gốc repo thay vào. |
| "Không thể kết nối tới máy chủ" ở frontend | CORS: thiếu/sai `CORS_ALLOWED_ORIGINS` trên backend, hoặc backend Free đang "ngủ" (đợi tới 50s cho lần đầu). |
| Deploy backend chậm bất thường / port scan timeout | Bình thường nếu đang giữa lúc Flyway chạy hàng loạt migration — đợi Flyway xong, Render sẽ tự phát hiện cổng mở. |
