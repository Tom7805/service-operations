Handover notes — VHDV-44 (NCL-04-CN-005)

What changed
- Hoàn thiện giao diện cảnh báo hạn mức hợp đồng theo User Story NCL-04-CN-005 ("Cảnh báo khi sắp vượt hạn mức hợp đồng").
- Tạo component `ContractLimitAlert.tsx` (trước đó là file rỗng 0 bytes) hỗ trợ cả chế độ modal dialog và card view.
- Tạo API client `getContractUsage` / `fetchContractUsage` gọi đến endpoint `GET /contracts/{contractId}/usage` của backend.
- Bổ sung interface `ContractUsageRes` trong `contractTypes.ts`.
- Gắn nút "Cảnh báo hạn mức" vào từng dòng hợp đồng trong bảng hợp đồng của `CustomerOverviewPanel.tsx` (hiển thị cho vai trò `VT-02` Quản lý dự án và `VT-05` Kế toán).
- Bổ sung class `.alert-box--warning` và styles thẻ đo tiến độ hạn mức trong `index.css`.
- Viết 8 test cases tự động trong `ContractLimitAlert.test.tsx` và 1 test case tích hợp trong `CustomerOverviewPanel.test.tsx`.

Luồng sử dụng
1. Quản lý dự án (`VT-02`) hoặc Kế toán (`VT-05`) vào màn hình Tổng hợp hồ sơ khách hàng.
2. Tại bảng danh sách "Hợp đồng", bấm nút "Cảnh báo hạn mức" trên dòng hợp đồng cần kiểm tra.
3. Hệ thống nạp dữ liệu chi tiết hợp đồng và gọi API `GET /contracts/{id}/usage` để lấy mức độ sử dụng hạn mức (dựa trên tổng các mốc thanh toán đã chuyển sang trạng thái INVOICED).
4. Modal mở ra hiển thị:
   - Banner phân loại cảnh báo:
     + Sắp vượt hạn mức (TC-01, màu vàng/amber, khi đã dùng >= 80% hạn mức).
     + Đã vượt hạn mức (TC-02, màu đỏ/danger, khi usedValue > limitValue).
     + Không đặt hạn mức (màu xanh dương/info, khi limitValue == null).
     + An toàn (màu xanh lá/success, khi usedValue < 80% limitValue).
   - Thanh tiến độ hiển thị % sử dụng với mã màu trực quan.
   - Thống kê chi tiết: Tổng giá trị hợp đồng, Hạn mức trần, Đã xuất hóa đơn, Còn lại, Tỷ lệ sử dụng.

Vai trò
- Nút "Cảnh báo hạn mức" hiển thị cho `VT-02` (Quản lý dự án) và `VT-05` (Kế toán).
- Component `ContractLimitAlert` cũng kiểm tra vai trò người dùng (`isAllowed`) và hiển thị thông báo từ chối truy cập nếu thiếu vai trò, không gọi API backend.

Kiểm thử
- `ContractLimitAlert.test.tsx`:
  + TC-01: cảnh báo sắp vượt hạn mức (ngưỡng 80%).
  + TC-02: cảnh báo khi đã vượt hạn mức.
  + TC-03: từ chối vai trò khác Quản lý dự án / Kế toán.
  + Cho phép cả VT-02 và VT-05 truy cập.
  + Trạng thái hợp đồng không đặt hạn mức trần.
  + Trạng thái sử dụng an toàn (< 80%).
  + Xử lý lỗi API backend.
  + Callback đóng modal.
- `CustomerOverviewPanel.test.tsx`:
  + Kiểm tra nút "Cảnh báo hạn mức" hiển thị cho VT-02 và bấm nút nạp hợp đồng mở modal.
