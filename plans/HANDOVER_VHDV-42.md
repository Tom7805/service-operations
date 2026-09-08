Handover notes — VHDV-42 (NCL-04-CN-003)

What changed (bản sửa cuối, thay cho bản nháp ban đầu)
- Bản nháp đầu tiên của story này giả định backend có API tạo/sửa/xóa từng mốc
  riêng lẻ (`POST`/`PUT /{mid}`/`DELETE /{mid}`) — các endpoint này **không tồn
  tại**. Backend thực tế chỉ có `GET /contracts/{id}/milestones` (danh sách) và
  `PUT /contracts/{id}/milestones` (thay thế TRỌN BỘ danh sách trong một giao
  dịch, từ chối nếu tổng khác giá trị hợp đồng — QTN-19). Đã viết lại toàn bộ
  UI cho khớp đúng ngữ nghĩa "thay thế trọn bộ" này.
- `ContractDetailPage.tsx` (bản nháp) dùng `useParams()` của `react-router-dom`
  trong khi toàn bộ app không có `Router` provider nào — trang sẽ crash ngay
  khi render, và cũng không được gắn route nào nên không thể truy cập được.
  Đã xóa file này cùng `MilestoneTable.tsx`, thay bằng
  `components/ContractMilestonesModal.tsx` — một modal cùng khuôn mẫu với
  `ContractTypeLimitModal.tsx` (Story NCL-04-CN-002), mở từ nút "Mốc thanh
  toán" ở dòng hợp đồng trong `CustomerOverviewPanel.tsx`.

Luồng sử dụng
1. Kế toán (VT-05) mở hồ sơ tổng hợp khách hàng, ở nhóm "Hợp đồng" bấm nút
   "Mốc thanh toán" trên dòng hợp đồng cần khai báo.
2. Hệ thống gọi `GET /contracts/{id}` để lấy `totalValue` hiện tại, rồi
   `GET /contracts/{id}/milestones` để nạp danh sách đang có (nếu trống thì
   hiển thị sẵn một dòng trống để nhập).
3. Kế toán thêm/sửa/xóa dòng ngay trong bảng (chỉ ở trình duyệt, chưa gửi lên
   server), hệ thống hiển thị tổng hiện tại so với giá trị hợp đồng.
4. Bấm "Lưu danh sách mốc" gửi toàn bộ mảng qua `PUT /contracts/{id}/milestones`
   — chặn phía client nếu tổng khác giá trị hợp đồng hoặc thiếu tên/giá trị,
   sau đó vẫn dựa vào backend xác nhận lại (QTN-19).

Vai trò
- Nút "Mốc thanh toán" chỉ hiện với `VT-05`; modal cũng tự kiểm tra lại vai trò
  (ẩn toàn bộ bảng nếu không phải VT-05) để tránh lộ khi props bị truyền sai.

Test
- `frontend/src/modules/contracts/__tests__/ContractMilestonesModal.test.tsx`:
  tải danh sách đúng (TC-01), chặn lưu khi tổng khác giá trị hợp đồng (TC-02,
  QTN-19), ẩn cho vai trò khác VT-05 (TC-03), gọi đúng `replaceMilestones` với
  toàn bộ mảng khi lưu thành công.
