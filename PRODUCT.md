# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Nhân viên nội bộ của một công ty dịch vụ, dùng hệ thống song song ở hai bối cảnh ngang nhau (xác nhận với người dùng):
văn phòng (desktop) và hiện trường (điện thoại). Các vai trò xác nhận qua code/session này gồm: quản trị viên (VT-07,
quản lý tài khoản, phân quyền, 2FA), và các vai trò nghiệp vụ theo module (kinh doanh/khách hàng, dự án, chấm công,
chi phí, hóa đơn...). *[Suy luận từ README + mã nguồn: tên vai trò cụ thể theo từng phòng ban chưa được xác nhận —
docs/00-overview/user-roles.md tồn tại nhưng đang trống.]*

## Product Purpose

Hệ thống quản lý vận hành dịch vụ nội bộ (tên: "Vận Hành Dịch Vụ" / Service Operations) — theo README.md của dự án,
bao quát: khách hàng, cơ hội kinh doanh, hợp đồng, dự án, chấm công, chi phí, lợi nhuận, hóa đơn, nghiệm thu, báo cáo
và một cổng khách hàng riêng. *[Nguồn: README.md dòng mở đầu — coi là xác nhận, không phải suy luận.]*

## Operating Context

- Ứng dụng nghiệp vụ nội bộ (back-office), không phải sản phẩm public-facing/marketing.
- Đăng nhập có xác thực hai lớp TOTP (Google-Authenticator-style) — người dùng vừa thao tác trên desktop (nhập mã 6 số)
  vừa thao tác trên điện thoại (quét QR/nhập mã thủ công trong app xác thực) trong cùng một luồng.
- Một số vai trò thao tác trực tiếp trên điện thoại ngoài hiện trường (xác nhận với người dùng), nên các màn hình
  nghiệp vụ chính không được coi mobile chỉ là "xem cho biết" — phải dùng được thật sự, không chỉ responsive tối thiểu.

## Capabilities and Constraints

- Backend: Java 17/21, Spring Boot 3.2.5, MySQL 8, Flyway; role-based access qua `@PreAuthorize` theo mã vai trò
  dạng `VT-xx`.
- Frontend: React 18 + TypeScript + Vite; CSS thuần tự viết tay tại `frontend/src/assets/styles/index.css`
  (README liệt kê Tailwind CSS nhưng mã nguồn hiện tại của các trang đã xem trong phiên này dùng class CSS tự viết,
  không thấy dùng Tailwind utility class — *cần xác nhận lại nếu có mâu thuẫn khi rà từng trang*).
- Không có DESIGN.md hay hệ thống token màu/typography chính thức nào tồn tại trước đó
  (`docs/06-ui/design-tokens.md` có trong repo nhưng đang trống) — đây là lý do cần thiết lập DESIGN.md mới.
- Ngôn ngữ giao diện: tiếng Việt.

## Brand Commitments

Không có ràng buộc thương hiệu bắt buộc. Người dùng xác nhận: được tự do đề xuất lại bảng màu và kiểu chữ nếu điều đó
giúp hệ thống chuyên nghiệp hơn — chỉ cần giữ nguyên toàn bộ logic cốt lõi (event handler, gọi API, quản lý state).

## Evidence on Hand

Không có tài liệu thương hiệu, ảnh chụp màn hình chính thức, hay bộ nhận diện có sẵn trong repo tại thời điểm này
(các file docs/00-overview, docs/06-ui liên quan đang trống). Các quyết định thị giác trong đợt cải cách này sẽ dựa
trên việc đọc trực tiếp mã nguồn từng trang.

## Product Principles

1. Đây là công cụ vận hành nội bộ được thao tác lặp lại hàng ngày — ưu tiên tốc độ quét thông tin và độ rõ ràng của
   trạng thái (pill, badge, màu ngữ nghĩa) hơn là hiệu ứng trang trí.
2. Phải dùng tốt thật sự trên điện thoại ở nhiều màn hình nghiệp vụ, không chỉ trên desktop.
3. Mỗi lần nâng cấp giao diện giữ nguyên tuyệt đối logic cốt lõi đã hoạt động (event handler, gọi API, state) — chỉ
   nâng cấp cấu trúc HTML/CSS.
4. Cải cách triển khai theo từng trang, hoàn thiện dứt điểm một trang trước khi sang trang tiếp theo (theo lựa chọn
   của người dùng), thay vì sửa dàn trải nửa vời trên nhiều trang cùng lúc.

## Accessibility & Inclusion

Chưa có yêu cầu accessibility cụ thể nào được xác nhận. Áp dụng mức nền tảng hợp lý (contrast đủ, trạng thái focus
hiển thị rõ, tôn trọng `prefers-reduced-motion`) theo nguyên tắc chung của Impeccable, không phải yêu cầu riêng đã
xác nhận của dự án.
