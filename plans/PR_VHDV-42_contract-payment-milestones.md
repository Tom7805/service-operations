Title: FE: NCL-04-CN-003 — Quản lý mốc thanh toán của hợp đồng

Summary
- Thêm UI khai báo mốc thanh toán hợp đồng (`ContractMilestonesModal`), mở từ
  nút "Mốc thanh toán" ở dòng hợp đồng trong hồ sơ tổng hợp khách hàng.
- Thêm API client `fetchMilestones` (GET) và `replaceMilestones` (PUT — thay
  thế trọn bộ danh sách trong một giao dịch), khớp đúng thiết kế backend hiện
  có (không có API tạo/sửa/xóa từng mốc riêng lẻ).
- Sửa lại bản nháp ban đầu: bỏ giả định các endpoint POST/PUT-đơn/DELETE
  không tồn tại trên backend; bỏ `ContractDetailPage.tsx` dùng
  `react-router-dom` (`useParams`) trong khi app không có `Router` provider —
  trang sẽ crash và cũng không có route nào dẫn tới.

Files changed
- frontend/src/modules/contracts/api/contractsApi.ts
- frontend/src/modules/contracts/types/contractTypes.ts
- frontend/src/modules/contracts/components/ContractMilestonesModal.tsx (mới)
- frontend/src/modules/contracts/__tests__/ContractMilestonesModal.test.tsx (mới)
- frontend/src/modules/customers/components/CustomerOverviewPanel.tsx (gắn nút mở modal)
- Xóa: frontend/src/modules/contracts/components/MilestoneTable.tsx,
  frontend/src/modules/contracts/pages/ContractDetailPage.tsx

Acceptance criteria mapping
- NCL-04-CN-003-TC-01: Tải đúng danh sách mốc hiện có; thêm/sửa/xóa dòng ở
  client rồi lưu thành công khi tổng bằng đúng giá trị hợp đồng.
- NCL-04-CN-003-TC-02 (QTN-19): Chặn lưu ở client khi tổng khác giá trị hợp
  đồng hoặc thiếu tên/giá trị dương; backend vẫn là nguồn xác nhận cuối cùng
  (400 `VALIDATION_ERROR`) và hiển thị đúng message backend trả về.
- NCL-04-CN-003-TC-03: Chỉ Kế toán (VT-05) thấy nút và nội dung modal; vai trò
  khác không thấy nút "Mốc thanh toán", và nếu props vai trò sai thì modal tự
  ẩn bảng, chỉ hiện thông báo yêu cầu vai trò.

Test / QA steps
1. Mở hồ sơ tổng hợp một khách hàng có hợp đồng, đăng nhập vai trò Kế toán.
2. Ở nhóm "Hợp đồng", bấm "Mốc thanh toán" trên một dòng hợp đồng.
3. Xác nhận danh sách mốc hiện có (nếu có) được nạp đúng, tổng hiển thị đúng.
4. Thêm/sửa mốc sao cho tổng bằng giá trị hợp đồng — Lưu thành công.
5. Thử lưu khi tổng khác giá trị hợp đồng — hệ thống báo lỗi, không gửi lên
   server (hoặc backend từ chối nếu vẫn gửi).
6. Đăng nhập vai trò khác VT-05 — xác nhận không thấy nút "Mốc thanh toán".

Merge checklist (for approvers)
- [x] `tsc --noEmit` sạch, không lỗi kiểu.
- [x] `mvn test` (backend, không đổi) và `vitest run` (frontend) đều pass.
- [x] Có test tự động cho TC-01/02/03 (`ContractMilestonesModal.test.tsx`).
- [ ] QA thủ công trên môi trường dev với backend thật (khuyến nghị trước khi merge).
