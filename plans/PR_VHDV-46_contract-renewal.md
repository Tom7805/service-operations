Title: FE: NCL-04-CN-007 — Gia hạn hợp đồng

Summary
- Thêm giao diện gia hạn hợp đồng (`RenewalModal.tsx`) mở từ nút "Gia hạn hợp đồng" tại mỗi dòng hợp đồng trong hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel.tsx`).
- Bổ sung API client `createRenewal(contractId, payload)` (POST) và `fetchRenewals(contractId)` (GET) gọi trực tiếp endpoint `POST /contracts/{contractId}/renewals` và `GET /contracts/{contractId}/renewals` khớp 100% với backend (`ContractController`, `ContractRenewalServiceImpl`, DTO `RenewalCreateReq`, `RenewalRes`).
- Xây dựng bộ kiểm tra hợp lệ phía client (`contractValidators.ts`): kiểm tra bắt buộc `newEndDate`, đảm bảo `newEndDate` sau `endDate` hiện tại (TC-01, TC-03), `additionalValue >= 0` (TC-03), và kiểm tra hạn mức tràn `limitValue` (QTN-19).
- Thẻ xem trước kết quả gia hạn realtime: hiển thị ngày kết thúc mới, giá trị cộng thêm, và tổng giá trị hợp đồng mới kèm cảnh báo nếu vượt hạn mức quy định.
- Chặn và hướng dẫn lập hợp đồng mới đối với các hợp đồng đã đóng (khác `ACTIVE`, ví dụ `COMPLETED`/`TERMINATED`) theo đúng tiêu chí TC-02 và backend `INVALID_STATE`.
- Bảng lịch sử các lần gia hạn hợp đồng (thời điểm, người tạo, ngày kết thúc cũ ➔ mới, giá trị cũ ➔ mới, giá trị cộng thêm, ghi chú).
- Kiểm soát phân quyền chặt chẽ: chỉ Nhân viên kinh doanh (`VT-04`) mới thấy nút thao tác và được phép thực hiện gia hạn (TC-04).

Files changed
- frontend/src/modules/contracts/types/contractTypes.ts (bổ sung `RenewalCreateReq`, `RenewalRes`)
- frontend/src/modules/contracts/api/contractsApi.ts (thêm `createRenewal`, `fetchRenewals`)
- frontend/src/modules/contracts/validators/contractValidators.ts (thêm `validateRenewalForm`)
- frontend/src/modules/contracts/components/RenewalModal.tsx (triển khai hoàn chỉnh modal gia hạn & lịch sử)
- frontend/src/modules/contracts/__tests__/RenewalModal.test.tsx (mới, 8 unit tests bao phủ TC-01 -> TC-05)
- frontend/src/modules/customers/components/CustomerOverviewPanel.tsx (thêm nút "Gia hạn hợp đồng" và gắn `RenewalModal` cho VT-04)
- frontend/src/modules/customers/__tests__/CustomerOverviewPanel.test.tsx (bổ sung 3 test cases cho phân quyền và mở modal)
- frontend/src/assets/styles/index.css (bổ sung styles `.alert-box--warning`, `.renewal-modal-card`, `.renewal-preview-card`, `.renewal-history-wrap`)

Acceptance criteria mapping
- NCL-04-CN-007-TC-01: Cho phép Nhân viên kinh doanh (VT-04) gia hạn hợp đồng đang hiệu lực (ACTIVE); nhập ngày kết thúc mới, giá trị bổ sung (tuỳ chọn) và ghi chú; cập nhật ngày và giá trị hợp đồng sau khi lưu thành công.
- NCL-04-CN-007-TC-02: Từ chối gia hạn khi hợp đồng đã đóng (COMPLETED, TERMINATED); hiển thị cảnh báo hướng dẫn lập hợp đồng mới và ẩn form tạo; xử lý đúng mã lỗi INVALID_STATE từ backend.
- NCL-04-CN-007-TC-03: Bắt lỗi validation client-side khi thiếu ngày kết thúc mới, ngày mới không sau ngày hiện tại, giá trị bổ sung âm, hoặc giá trị sau gia hạn vượt hạn mức trần (QTN-19); hiển thị đúng lỗi VALIDATION_ERROR từ backend.
- NCL-04-CN-007-TC-04: Tải và hiển thị danh sách lịch sử gia hạn từ máy chủ (thời điểm, người tạo, ngày cũ ➔ mới, giá trị cũ ➔ mới); kiểm soát phân quyền: ẩn nút với các vai trò khác VT-04 và modal tự động từ chối nếu vai trò không hợp lệ.

Test / QA steps
1. Đăng nhập với tài khoản Nhân viên kinh doanh (`role = 'VT-04'`).
2. Mở hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel`), cuộn đến khối Hợp đồng.
3. Trên dòng hợp đồng đang `ACTIVE`, bấm nút "Gia hạn hợp đồng".
4. Xác nhận modal mở ra, hiển thị đúng thông tin hợp đồng hiện tại và bảng lịch sử gia hạn (nếu có).
5. Nhập ngày kết thúc mới lớn hơn ngày kết thúc hiện tại, nhập giá trị bổ sung (ví dụ: 100.000.000) -> thẻ xem trước tự động cập nhật tổng giá trị mới.
6. Bấm "Xác nhận gia hạn" -> lưu thành công, modal đóng và danh sách tổng hợp được làm mới.
7. Thử gia hạn hợp đồng có trạng thái khác `ACTIVE` (ví dụ `COMPLETED`) -> xác nhận hiển thị cảnh báo "Chỉ gia hạn được hợp đồng đang còn hiệu lực (ACTIVE); hợp đồng đã đóng vui lòng lập hợp đồng mới", form tạo gia hạn bị ẩn.
8. Thử nhập ngày kết thúc mới trước hoặc bằng ngày hiện tại, hoặc nhập số tiền âm, hoặc nhập tiền vượt hạn mức trần -> xác nhận hệ thống báo lỗi chi tiết tương ứng.
9. Đăng nhập với tài khoản vai trò khác (ví dụ `VT-05`) -> nút "Gia hạn hợp đồng" hoàn toàn không hiển thị.

Merge checklist (for approvers)
- [x] `tsc -b` sạch sẽ, không lỗi kiểu dữ liệu (0 errors).
- [x] `vitest run` pass 100% cả contracts (16 tests) và customer overview (12 tests) cũng như toàn bộ frontend (296/296 tests pass).
- [x] `eslint` sạch sẽ trên toàn bộ các file đã sửa và file mới (0 errors, 0 warnings).
- [x] `vite build` tạo production bundle sạch sẽ.
- [x] Backend `mvn -Dtest=*Contract* test` pass 46/46 tests (BUILD SUCCESS).
- [x] Khớp 100% spec `docs/04-api/api-contract.md § NCL-04-CN-007`.
