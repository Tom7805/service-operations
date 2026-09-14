Title: FE: NCL-04-CN-006 — Nhắc hợp đồng sắp hết hiệu lực

Summary
- Thêm UI nhắc và tra cứu hợp đồng sắp hết hạn (`ContractExpiryReminderModal`), mở từ nút "Nhắc hợp đồng sắp hết hạn" trên thanh tiêu đề danh sách hợp đồng trong hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel.tsx`).
- Thêm API client `fetchExpiringContracts(days)` và alias `getExpiringContracts(days)` gọi endpoint `GET /contracts/expiring?days=${days}`, khớp 100% với backend `ContractController.getExpiringContracts(@RequestParam(defaultValue = "30") int days)` và DTO `ContractExpiryAlertRes`.
- Bổ sung bộ lọc thời gian tiện lợi với các mốc chuẩn (15, 30, 60, 90 ngày) cùng ô nhập số ngày tùy chỉnh, có validation phía client chặn số ngày âm (`days < 0`).
- Trực quan hóa số ngày còn lại (`daysRemaining`) với huy hiệu màu phân cấp độ khẩn cấp (Khẩn cấp <= 7 ngày, Cảnh báo <= 30 ngày, Bình thường > 30 ngày) và empty state khi không có hợp đồng sắp hết hạn.
- Kiểm soát phân quyền chặt chẽ: chỉ Kế toán (`VT-05`) mới thấy nút mở modal và được phép xem nội dung tra cứu.

Files changed
- frontend/src/modules/contracts/types/contractTypes.ts (bổ sung kiểu `ContractExpiryAlertRes`)
- frontend/src/modules/contracts/api/contractsApi.ts (bổ sung `fetchExpiringContracts`, `getExpiringContracts`)
- frontend/src/assets/styles/index.css (bổ sung CSS filter bar, badge phân cấp khẩn cấp, alert box warning, empty state)
- frontend/src/modules/contracts/components/ContractExpiryReminderModal.tsx (mới)
- frontend/src/modules/contracts/__tests__/ContractExpiryReminderModal.test.tsx (mới, 6 unit tests)
- frontend/src/modules/customers/components/CustomerOverviewPanel.tsx (gắn nút và modal cho VT-05)
- frontend/src/modules/customers/__tests__/CustomerOverviewPanel.test.tsx (bổ sung test phân quyền và mở modal)

Acceptance criteria mapping
- NCL-04-CN-006-TC-01: Tải và hiển thị danh sách hợp đồng sắp hết hạn theo mặc định 30 ngày; hiển thị đầy đủ mã hợp đồng, tên hợp đồng, khách hàng, ngày hết hạn và số ngày còn lại.
- NCL-04-CN-006-TC-02: Cho phép lọc theo các mốc 15, 30, 60, 90 ngày hoặc tùy chỉnh số ngày; kiểm tra hợp lệ chặn số ngày âm (`days < 0`).
- NCL-04-CN-006-TC-03: Hiển thị trạng thái thân thiện (empty state) khi không có hợp đồng nào hết hạn trong khoảng thời gian đã chọn.
- NCL-04-CN-006-TC-04: Phân quyền vai trò VT-05 (Kế toán); ẩn nút thao tác với các vai trò khác (VT-01, VT-02, VT-03, VT-04, VT-06); modal tự kiểm tra vai trò phòng thủ và từ chối nếu không đúng vai trò VT-05.

Test / QA steps
1. Đăng nhập hệ thống với tài khoản Kế toán (`role = 'VT-05'`).
2. Mở hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel`).
3. Tại khối "Hợp đồng", bấm nút "Nhắc hợp đồng sắp hết hạn".
4. Xác nhận modal mở ra, tải mặc định mốc 30 ngày và hiển thị các hợp đồng sắp hết hạn với badge số ngày còn lại được sắp xếp tăng dần.
5. Thử chuyển đổi các mốc lọc nhanh (15 ngày, 60 ngày, 90 ngày) hoặc nhập số ngày tùy chỉnh (ví dụ: 45) -> bấm "Áp dụng" -> danh sách cập nhật tương ứng.
6. Thử nhập số ngày âm (ví dụ: -5) -> hệ thống báo lỗi xác thực "Số ngày phải là số nguyên không âm (>= 0)" và không gửi request không hợp lệ lên backend.
7. Khi không có hợp đồng nào hết hạn trong mốc thời gian -> hiển thị thông báo "Không có hợp đồng nào sắp hết hiệu lực trong vòng X ngày tới".
8. Đăng nhập với vai trò khác (ví dụ: VT-01, VT-02, VT-03) -> nút "Nhắc hợp đồng sắp hết hạn" hoàn toàn không hiển thị.

Merge checklist (for approvers)
- [x] `tsc -b` sạch sẽ, không có lỗi kiểu dữ liệu.
- [x] `vitest run` pass 100% cả `CustomerOverviewPanel.test.tsx` (10 tests) và `src/modules/contracts/` (14 tests).
- [x] `vite build` build production thành công không lỗi cú pháp hay import.
- [x] Khớp chuẩn endpoint `GET /contracts/expiring?days={days}` và vai trò `VT-05` của backend.
