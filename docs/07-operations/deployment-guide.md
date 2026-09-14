# Hướng dẫn deploy lên server

## Sơ đồ luồng

```
[Máy cá nhân]              [Git Repository]                              [Server Deploy]
Local DB + Feature ──────► develop ──────► release/vX ──────► main (Gắn Tag) ──────► Chạy Migration + Seed
(Tự do test/đập phá)       (Gộp code)       (Chốt & đóng băng)  (Code ổn định nhất)     (Mentor xem bản này)
```

- `develop`: mỗi dev tự do code, test trên **DB local riêng** (Docker/XAMPP), không ảnh hưởng ai khác.
- `release/vX`: gộp `develop` vào để test tổng hợp trước khi chốt bản.
- `main`: luôn ở trạng thái chạy được. Mọi commit lên `main` sẽ **tự động deploy** lên server qua GitHub Actions (`.github/workflows/deploy.yml`).
- Server: chạy Docker Compose (mysql + backend + frontend) với **DB riêng, độc lập với DB local của mọi dev**. Backend chạy profile `dev` → Flyway tự áp migration + seed data mẫu, để mentor xem có dữ liệu ngay.

## 1. Setup server (làm một lần)

1. Thuê VPS (DigitalOcean/Vultr/Contabo, Ubuntu 22.04, 1-2GB RAM là đủ cho quy mô demo).
2. Cài Docker + Compose plugin:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Mở firewall cho các cổng cần dùng:
   ```bash
   ufw allow 22/tcp
   ufw allow 8080/tcp   # backend
   ufw allow 5173/tcp   # frontend
   ufw enable
   ```
4. Clone repo:
   ```bash
   git clone <repo-url> /opt/service-operations
   cd /opt/service-operations
   ```
5. Tạo `.env` **trực tiếp trên server** (copy từ `.env.example`, điền giá trị thật — không dùng `changeme`):
   ```bash
   cp .env.example .env
   nano .env
   ```
   - `SPRING_PROFILES_ACTIVE=dev` (để Flyway chạy cả seed data mẫu).
   - Đặt `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_SECRET` là giá trị ngẫu nhiên mạnh, không để mặc định.
   - `.env` chỉ nằm trên server, **không commit, không đi qua CI/CD**.
6. Chạy thử lần đầu:
   ```bash
   docker compose up -d --build
   docker compose logs -f backend
   ```
   Kiểm tra log thấy Flyway migrate + áp seed (`R__seed_*.sql`) thành công, không lỗi.

## 2. Thiết lập CI/CD tự động deploy

Workflow đã có sẵn tại [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml): mỗi khi có commit mới trên `main`, GitHub Actions SSH vào server, `git pull` và `docker compose up -d --build`.

Cần cấu hình phía server + GitHub:

1. Tạo cặp khoá SSH riêng cho deploy (trên máy cá nhân hoặc server):
   ```bash
   ssh-keygen -t ed25519 -f deploy_key -N ""
   ```
2. Thêm public key (`deploy_key.pub`) vào `~/.ssh/authorized_keys` trên server.
3. Vào GitHub repo → Settings → Secrets and variables → Actions, thêm:
   - `DEPLOY_HOST`: IP server.
   - `DEPLOY_USER`: user SSH trên server (vd `root` hoặc user riêng).
   - `DEPLOY_SSH_KEY`: nội dung private key (`deploy_key`).
4. Merge một commit vào `main`, kiểm tra tab **Actions** chạy job `deploy` màu xanh.

Muốn deploy lại thủ công mà không cần commit mới: vào tab Actions → chọn workflow "Deploy to server" → **Run workflow**.

## 3. Dev vẫn test local thoải mái

Không đổi gì trong cách làm việc hiện tại:

- Chạy stack local bằng `scripts/dev-up.sh`, DB local hoàn toàn tách biệt với DB trên server.
- Làm sạch + seed lại DB local bất cứ lúc nào: `scripts/db-reset.sh` rồi khởi động backend một lần (Flyway tự tạo schema + seed vì profile `dev` local có `classpath:db/seed`).
- Chỉ muốn refresh seed data (không đụng schema, không xoá dữ liệu tự nhập để test): `scripts/seed-demo-data.sh`.

DB server và DB local của từng dev là hai database vật lý khác nhau — không bao giờ đụng nhau.

## 4. Rollback khi bản mới lỗi

- Cách 1 (khuyến nghị): `git revert` commit lỗi trên `main`, push — CI/CD tự deploy lại bản đã revert.
- Cách 2 (khẩn cấp, thủ công): SSH vào server, checkout tag/commit ổn định trước đó rồi build lại:
  ```bash
  cd /opt/service-operations
  git checkout <tag-hoac-commit-cu>
  docker compose up -d --build
  ```

## 5. Kiểm tra sau khi deploy

- `docker compose ps` trên server: 3 container (`mysql`, `backend`, `frontend`) đều `running`.
- `curl http://<server-ip>:8080/actuator/health` trả về `{"status":"UP"}` (nếu Actuator được bật) hoặc gọi thử một API public khác.
- Mở `http://<server-ip>:5173`, đăng nhập bằng tài khoản có trong seed data, xác nhận thấy dữ liệu mẫu (khách hàng/dự án/nhân viên...).
- Kiểm tra bảng `flyway_schema_history` trong MySQL trên server: mọi migration (`V*`) và seed (`R__*`) đều `success = 1`, không có dòng lỗi.

## Troubleshooting nhanh

| Vấn đề | Kiểm tra |
|---|---|
| Backend không lên | `docker compose logs backend` — thường do `.env` thiếu biến bắt buộc (vd SMTP ở profile `prod`, nhưng ở đây dùng `dev` nên không bắt buộc SMTP). |
| Seed không chạy | Xác nhận `SPRING_PROFILES_ACTIVE=dev` trong `.env` trên server — profile `prod` cố ý loại `db/seed` khỏi Flyway locations. |
| CI/CD báo lỗi SSH | Kiểm tra lại 3 secrets `DEPLOY_HOST/DEPLOY_USER/DEPLOY_SSH_KEY`, và public key tương ứng đã có trong `authorized_keys` trên server chưa. |
| Migration Flyway lỗi checksum | Không sửa lại file migration cũ đã chạy trên server — luôn thêm file `V{n+1}__*.sql` mới, không sửa `V{n}` đã tồn tại. |
