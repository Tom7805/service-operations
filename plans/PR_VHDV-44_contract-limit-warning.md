Title: FE: NCL-04-CN-005 — Cảnh báo khi sắp vượt hạn mức hợp đồng

Summary
- Bổ sung UI cảnh báo và hiển thị mức độ sử dụng hạn mức trần hợp đồng (`ContractLimitAlert`), mở từ nút "Cảnh báo hạn mức" trên từng dòng hợp đồng trong hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel`).
- Thêm interface DTO `ContractUsageRes` và API client `getContractUsage` (GET `/contracts/{contractId}/usage`), khớp 100% với endpoint backend đã hiện thực tại `ContractLimitServiceImpl`.
- Hiển thị trực quan theo các mức cảnh báo nghiệp vụ:
  + TC-01: Cảnh báo sắp vượt hạn mức khi tỷ lệ đã xuất hóa đơn (`usedValue` từ các mốc `INVOICED`) đạt từ 80% hạn mức trần trở lên (`nearLimit = true`).
  + TC-02: Cảnh báo nguy hiểm khi đã vượt quá hạn mức (`overLimit = true`).
  + Không đặt hạn mức: Thông báo trung tính, không cảnh báo khi `limitValue == null`.
  + An toàn: Hiển thị trạng thái an toàn màu xanh khi dưới 80% hạn mức.
- Phân quyền (TC-03): Chỉ Quản lý dự án (`VT-02`) hoặc Kế toán (`VT-05`) được phép xem cảnh báo; các vai trò khác bị từ chối truy cập.
- Bổ sung thanh tiến độ trực quan (Progress Bar) với mã màu và thẻ thống kê số liệu (tổng giá trị, hạn mức trần, đã dùng, còn lại, %).
- Bộ kiểm thử tự động 8 test cases trong `ContractLimitAlert.test.tsx` và 1 test case tích hợp trong `CustomerOverviewPanel.test.tsx`.

Files changed
- frontend/src/modules/contracts/types/contractTypes.ts (bổ sung ContractUsageRes)
- frontend/src/modules/contracts/api/contractsApi.ts (bổ sung getContractUsage, fetchContractUsage)
- frontend/src/modules/contracts/components/ContractLimitAlert.tsx (viết mới toàn diện)
- frontend/src/modules/contracts/__tests__/ContractLimitAlert.test.tsx (viết mới 8 test cases)
- frontend/src/modules/customers/components/CustomerOverviewPanel.tsx (gắn nút "Cảnh báo hạn mức" và modal ContractLimitAlert)
- frontend/src/modules/customers/__tests__/CustomerOverviewPanel.test.tsx (thêm test tích hợp mở modal)
- frontend/src/assets/styles/index.css (thêm class .alert-box--warning và styles contract-limit)

Acceptance criteria mapping
- NCL-04-CN-005-TC-01: Hiển thị cảnh báo màu vàng khi tỷ lệ sử dụng đạt hoặc vượt ngưỡng cảnh báo 80% hạn mức trần nhưng chưa vượt (`nearLimit = true`), hiển thị đúng phần trăm và số tiền còn lại.
- NCL-04-CN-005-TC-02: Hiển thị cảnh báo nguy hiểm màu đỏ khi giá trị đã xuất hóa đơn vượt hạn mức (`overLimit = true`), hiển thị số tiền vượt.
- NCL-04-CN-005-TC-03: Phân quyền vai trò nghiêm ngặt: Cho phép Quản lý dự án (`VT-02`) và Kế toán (`VT-05`); từ chối các vai trò khác (như `VT-04`, `VT-07`).
- Hợp đồng không đặt hạn mức (`limitValue = null`): Hiển thị thông báo an toàn/không áp dụng cảnh báo.

Test / QA steps
1. Đăng nhập với vai trò Quản lý dự án (`VT-02`) hoặc Kế toán (`VT-05`).
2. Mở hồ sơ chi tiết một khách hàng, kéo đến bảng "Hợp đồng".
3. Xác nhận có nút "Cảnh báo hạn mức" trên các dòng hợp đồng.
4. Bấm nút "Cảnh báo hạn mức" -> modal hiển thị đầy đủ thông tin: tổng giá trị, hạn mức, đã xuất hóa đơn, còn lại và thanh tiến độ.
5. Kiểm tra các trường hợp:
   - Hợp đồng đã dùng >= 80%: Banner cảnh báo màu vàng "CẢNH BÁO: SẮP VƯỢT HẠN MỨC TRẦN!".
   - Hợp đồng đã dùng > 100%: Banner cảnh báo màu đỏ "CẢNH BÁO: ĐÃ VƯỢT HẠN MỨC!".
   - Hợp đồng chưa đặt hạn mức: Banner thông tin màu xanh dương "Hợp đồng không đặt hạn mức".
   - Hợp đồng dùng < 80%: Banner trạng thái màu xanh lá "Mức sử dụng an toàn".
6. Đăng nhập với vai trò không phải VT-02 / VT-05 (ví dụ VT-07) -> xác nhận không thấy nút "Cảnh báo hạn mức".

Merge checklist (for approvers)
- [x] `tsc -b` và `tsc --noEmit` sạch, 0 lỗi kiểu.
- [x] `vite build` tạo bundle thành công.
- [x] Toàn bộ test của module contract (`16/16`) và customer panel (`10/10`) đều pass.
- [x] Không thay đổi code backend (backend đã có sẵn từ commit f66ed76).
