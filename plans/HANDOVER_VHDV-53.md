Handover notes — VHDV-53 (NCL-05-CN-001)

Story: NCL-05-CN-001 — Tạo dự án từ hợp đồng
Nhánh: VHDV-53-create-project-from-contract
Tác vụ: Bổ sung Frontend hoàn chỉnh, đảm bảo đầy đủ tiêu chí chấp thuận (TC-01, TC-02, TC-03, TC-04, TC-05), khớp 100% với Backend hiện tại.

What changed
- Đã phân tích chi tiết API backend hiện có:
  - `POST /contracts/{contractId}/projects`: Tạo dự án từ hợp đồng (yêu cầu vai trò VT-02, chỉ hợp đồng ACTIVE và chưa quá endDate, expectedEndDate >= startDate, người quản lý dự án tồn tại và ACTIVE).
  - Backend tự sinh `projectCode` ("DA-xxxx"), gán `customerId`, `projectType`, `limitValue`, `status = RUNNING`, ghi audit log `CREATE_FROM_CONTRACT`.
  - Phân quyền: `@PreAuthorize("hasRole('VT-02')")` (Quản lý dự án).
- Cập nhật kiểu dữ liệu tại `frontend/src/modules/projects/types/projectTypes.ts` & `frontend/src/modules/contracts/types/contractTypes.ts`:
  - `ProjectStatus`, `ProjectCreateFromContractReq`, `ProjectRes`, `ContractTargetForProject`.
- Bổ sung API client tại `frontend/src/modules/projects/api/projectsApi.ts` & `frontend/src/modules/contracts/api/contractsApi.ts`:
  - `createProjectFromContract(contractId, payload)`
  - Lớp lỗi `ProjectsApiError` với trích xuất `code`, `message`, `statusCode`, `fieldErrors`.
- Viết bộ validator client-side tại `frontend/src/modules/projects/validators/projectValidators.ts`:
  - `validateProjectCreateForm(payload)`: kiểm tra tên dự án bắt buộc (không rỗng, <= 255 ký tự), ngày bắt đầu bắt buộc, ngày kết thúc dự kiến bắt buộc và >= ngày bắt đầu, ID người quản lý dự án bắt buộc (> 0).
- Hoàn thiện component `CreateProjectModal.tsx` tại `frontend/src/modules/contracts/components/CreateProjectModal.tsx`:
  - Kiểm tra vai trò VT-02; nếu thiếu vai trò sẽ hiển thị banner đỏ từ chối truy cập.
  - Kiểm tra trạng thái hợp đồng: Nếu hợp đồng không `ACTIVE` (ví dụ `DRAFT`, `COMPLETED`, `TERMINATED`), hiển thị cảnh báo màu vàng và ẩn form tạo theo TC-02.
  - Thẻ xem trước kế thừa thông tin từ hợp đồng (khách hàng, loại hợp đồng, hạn mức, trạng thái khởi tạo `RUNNING`).
  - Biểu mẫu nhập trực quan kèm nút tiện ích "Gán cho tôi" tự động lấy ID tài khoản hiện tại.
  - Re-export qua `frontend/src/modules/projects/components/ProjectFormModal.tsx`.
- Tích hợp vào `CustomerOverviewPanel.tsx`:
  - Thêm nút "Tạo dự án" tại mỗi dòng hợp đồng, chỉ hiển thị cho tài khoản có vai trò `VT-02`.
  - Mở trực tiếp `CreateProjectModal` mà không cần gọi `GET /contracts/{id}` (do endpoint đó chỉ cho phép VT-05).
  - Làm mới dữ liệu tổng hợp khách hàng sau khi tạo dự án thành công.
- Cập nhật CSS tại `frontend/src/assets/styles/index.css` với các class `.project-modal-card`, `.project-preview-card`, `.project-preview-grid`, `.project-preview-item`.

Kiểm thử tự động
- `CreateProjectModal.test.tsx` (9 unit tests):
  - TC-01: Tạo dự án từ hợp đồng ACTIVE thành công, kế thừa thông tin và gọi API đúng payload.
  - TC-02: Từ chối tạo dự án khi hợp đồng không còn hiệu lực (COMPLETED/TERMINATED), hiển thị cảnh báo và ẩn form.
  - TC-03a: Báo lỗi khi thiếu tên dự án hoặc chỉ toàn khoảng trắng.
  - TC-03b: Báo lỗi khi thiếu ngày bắt đầu hoặc ngày kết thúc dự kiến.
  - TC-03c: Báo lỗi khi ngày kết thúc dự kiến sớm hơn ngày bắt đầu.
  - TC-03d: Báo lỗi khi thiếu ID người quản lý dự án hoặc ID <= 0.
  - TC-04a: Từ chối truy cập khi không có vai trò VT-02.
  - TC-04b: Nút "Gán cho tôi" tự động điền ID người dùng đang đăng nhập.
  - TC-05: Hiển thị lỗi từ backend khi API thất bại.
- `projectValidators.test.ts` (8 unit tests):
  - Kiểm tra bao phủ đầy đủ tất cả các trường hợp biên của validator client-side.
- `CustomerOverviewPanel.test.tsx`:
  - Kiểm tra hiển thị nút "Tạo dự án" với vai trò VT-02 và ẩn với các vai trò khác (như VT-05).
  - Kiểm tra bấm nút mở đúng CreateProjectModal với thông tin hợp đồng đã chọn mà không gọi GET /contracts/{id}.
- Kết quả kiểm thử:
  - Frontend: 51 test files passed, 336/336 tests passed (100%).
  - TypeScript: `tsc -b` pass 0 lỗi.
  - ESLint: pass 0 lỗi, 0 warnings trên toàn bộ các file liên quan.
  - Vite build: build production bundle sạch sẽ (`dist/`).
  - Backend: Maven test `*Project*` pass 4/4 tests (BUILD SUCCESS).

Sẵn sàng merge
- Nhánh `VHDV-53-create-project-from-contract` đã sẵn sàng 100% để merge vào `develop`.
