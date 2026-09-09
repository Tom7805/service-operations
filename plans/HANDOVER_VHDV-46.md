Handover notes — VHDV-46 (NCL-04-CN-007)

Story: NCL-04-CN-007 — Gia hạn hợp đồng
Nhánh: VHDV-46-contract-renewal
Tác vụ: Bổ sung Frontend hoàn chỉnh, đảm bảo đầy đủ tiêu chí chấp thuận (TC-01, TC-02, TC-03, TC-04), khớp 100% với Backend hiện tại.

What changed
- Đã phân tích chi tiết API backend hiện có:
  - `POST /contracts/{contractId}/renewals`: Gia hạn hợp đồng (yêu cầu vai trò VT-04, chỉ hợp đồng ACTIVE, newEndDate sau endDate hiện tại, additionalValue >= 0, tuân thủ hạn mức QTN-19).
  - `GET /contracts/{contractId}/renewals`: Lấy danh sách lịch sử gia hạn của hợp đồng, mới nhất trước.
  - Phân quyền: `@PreAuthorize("hasRole('VT-04')")` (Nhân viên kinh doanh).
- Cập nhật kiểu dữ liệu tại `frontend/src/modules/contracts/types/contractTypes.ts`:
  - `RenewalCreateReq` (newEndDate, additionalValue, notes)
  - `RenewalRes` (id, contractId, previousEndDate, newEndDate, additionalValue, valueBefore, valueAfter, notes, createdBy, createdAt)
- Bổ sung API client tại `frontend/src/modules/contracts/api/contractsApi.ts`:
  - `createRenewal(contractId, payload)`
  - `fetchRenewals(contractId)`
- Viết bộ validator client-side tại `frontend/src/modules/contracts/validators/contractValidators.ts`:
  - `validateRenewalForm(...)`: kiểm tra ngày kết thúc mới bắt buộc và phải sau ngày hiện tại, kiểm tra số tiền không âm, kiểm tra hạn mức tràn QTN-19.
- Hoàn thiện component `RenewalModal.tsx` tại `frontend/src/modules/contracts/components/RenewalModal.tsx`:
  - Kiểm tra vai trò VT-04; nếu thiếu vai trò sẽ hiển thị banner từ chối truy cập.
  - Kiểm tra trạng thái hợp đồng: Nếu hợp đồng đã đóng (`status !== 'ACTIVE'`), hiển thị cảnh báo hướng dẫn lập hợp đồng mới theo TC-02 và ẩn form tạo gia hạn.
  - Form gia hạn với realtime preview: xem trước ngày mới, giá trị cộng thêm, và tổng giá trị hợp đồng mới kèm cảnh báo vượt hạn mức trần.
  - Bảng lịch sử gia hạn nạp tự động từ máy chủ, hiển thị thời điểm, người tạo, ngày cũ ➔ mới, giá trị cũ ➔ mới và ghi chú.
- Tích hợp vào `CustomerOverviewPanel.tsx`:
  - Thêm nút "Gia hạn hợp đồng" tại mỗi dòng hợp đồng, chỉ hiển thị cho tài khoản có vai trò `VT-04`.
  - Mở `RenewalModal` và làm mới dữ liệu sau khi lưu thành công.
- Cập nhật CSS tại `frontend/src/assets/styles/index.css` với các styles cảnh báo và preview.

Kiểm thử tự động
- `RenewalModal.test.tsx` (8 unit tests):
  - TC-01: Gia hạn hợp đồng ACTIVE thành công, cập nhật ngày và giá trị.
  - TC-02: Từ chối gia hạn khi hợp đồng đã đóng (COMPLETED), ẩn form tạo mới.
  - TC-03a: Báo lỗi khi thiếu ngày kết thúc mới hoặc ngày mới không sau ngày hiện tại.
  - TC-03b: Báo lỗi khi giá trị bổ sung âm.
  - TC-03c: Báo lỗi khi giá trị sau gia hạn vượt hạn mức trần (QTN-19).
  - TC-04a: Nạp và hiển thị đúng lịch sử gia hạn từ máy chủ.
  - TC-04b: Từ chối truy cập khi không có vai trò VT-04.
  - TC-05: Hiển thị lỗi từ backend khi API thất bại.
- `CustomerOverviewPanel.test.tsx`:
  - Kiểm tra hiển thị nút "Gia hạn hợp đồng" với vai trò VT-04 và ẩn với các vai trò khác.
  - Kiểm tra bấm nút mở đúng RenewalModal.
- Kết quả kiểm thử:
  - Frontend: 47 test files passed, 296/296 tests passed (100%).
  - TypeScript: `tsc -b` pass 0 lỗi.
  - ESLint: pass 0 lỗi trên toàn bộ các file liên quan.
  - Vite build: build production bundle thành công.
  - Backend: Maven test `*Contract*` pass 46/46 tests (BUILD SUCCESS).

Sẵn sàng merge
- Nhánh `VHDV-46-contract-renewal` đã sẵn sàng 100% để merge vào `develop`.
