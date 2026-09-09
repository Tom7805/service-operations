Handover notes — VHDV-45 (NCL-04-CN-006)

Story: NCL-04-CN-006 — Nhắc hợp đồng sắp hết hiệu lực
Nhánh: VHDV-45-expiring-contract-reminder
Tác vụ: Bổ sung Frontend hoàn chỉnh, đảm bảo đầy đủ tiêu chí chấp thuận (TC-01, TC-02, TC-03, TC-04), khớp 100% với Backend hiện tại.

What changed
- Đã phân tích chi tiết API backend hiện có:
  - Endpoint: `GET /contracts/expiring?days={days}` (mặc định days = 30).
  - Phân quyền backend: `@PreAuthorize("hasRole('VT-05')")` (Kế toán).
  - Response DTO: `List<ContractExpiryAlertRes>` gồm:
    - `contractId` (number)
    - `contractCode` (string)
    - `name` (string)
    - `customerId` (number)
    - `customerName` (string | null)
    - `endDate` (string, ISO date YYYY-MM-DD)
    - `daysRemaining` (number, tính bằng ngày chênh lệch tới endDate, sắp xếp tăng dần)
- Đã thêm định nghĩa type `ContractExpiryAlertRes` vào `frontend/src/modules/contracts/types/contractTypes.ts`.
- Đã bổ sung hàm gọi API `fetchExpiringContracts(days = 30)` và alias `getExpiringContracts(days = 30)` vào `frontend/src/modules/contracts/api/contractsApi.ts`, chặn số ngày âm (`days < 0`) trước khi gọi API.
- Đã xây dựng component `ContractExpiryReminderModal.tsx` tại `frontend/src/modules/contracts/components/`:
  - Mặc định tải 30 ngày.
  - Bộ nút lọc nhanh: 15 ngày, 30 ngày, 60 ngày, 90 ngày kèm ô nhập ngày tùy biến.
  - Bảng danh sách chi tiết: Mã HĐ, Tên hợp đồng, Khách hàng, Ngày hết hạn, Số ngày còn lại kèm nhãn màu cảnh báo:
    - Đỏ (Urgent): còn <= 7 ngày.
    - Vàng (Warning): còn <= 30 ngày.
    - Xanh (Info): còn > 30 ngày.
  - Trạng thái trống (Empty state) hiển thị thông báo rõ ràng khi không có hợp đồng nào hết hạn trong khoảng ngày đã lọc.
  - Phòng thủ phân quyền: Kiểm tra vai trò người dùng, nếu không phải `VT-05` sẽ hiển thị thông báo từ chối truy cập thay vì bảng dữ liệu.
- Đã tích hợp nút "Nhắc hợp đồng sắp hết hạn" trên thanh tiêu đề Hợp đồng trong `CustomerOverviewPanel.tsx`, kiểm tra quyền chỉ hiển thị khi `currentUser?.role === 'VT-05'`.
- Đã cập nhật CSS trong `frontend/src/assets/styles/index.css` với các kiểu dáng đẹp mắt, responsive, chuẩn thiết kế hiện tại của hệ thống.

Kiểm thử tự động
- `ContractExpiryReminderModal.test.tsx` (6 unit tests):
  - TC-01: Hiển thị danh sách hợp đồng với tham số mặc định 30 ngày.
  - TC-02: Bộ lọc ngày (chọn nút 60 ngày, nhập tùy chỉnh 45 ngày).
  - TC-02b: Bắt lỗi validation khi nhập số ngày âm (`days < 0`).
  - TC-03: Hiển thị trạng thái empty khi danh sách trống.
  - TC-04: Từ chối truy cập nếu không phải vai trò `VT-05`.
  - TC-05: Xử lý lỗi khi backend trả về mã lỗi HTTP.
- `CustomerOverviewPanel.test.tsx` (10 unit tests):
  - Kiểm tra nút "Nhắc hợp đồng sắp hết hạn" xuất hiện khi là `VT-05` và mở modal đúng khi click.
  - Kiểm tra nút bị ẩn với các vai trò khác (`VT-01`, etc.).
- Kết quả test:
  - `CustomerOverviewPanel.test.tsx`: 10/10 passed.
  - `src/modules/contracts/`: 14/14 passed.
  - `tsc -b`: 0 lỗi.
  - `vite build`: thành công.

Sẵn sàng merge
- Nhánh `VHDV-45-expiring-contract-reminder` đã sẵn sàng để tạo PR merge vào `develop`.
