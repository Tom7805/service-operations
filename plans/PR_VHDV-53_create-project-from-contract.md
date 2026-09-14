Title: FE: NCL-05-CN-001 — Tạo dự án từ hợp đồng

Summary
- Thêm giao diện tạo dự án từ hợp đồng (`CreateProjectModal.tsx`) mở từ nút "Tạo dự án" tại mỗi dòng hợp đồng trong hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel.tsx`).
- Bổ sung API client `createProjectFromContract(contractId, payload)` (POST) gọi trực tiếp endpoint `POST /contracts/{contractId}/projects` khớp 100% với backend (`ProjectController`, `ProjectServiceImpl`, DTO `ProjectCreateFromContractReq`, `ProjectRes`).
- Xây dựng bộ kiểm tra hợp lệ phía client (`projectValidators.ts`): kiểm tra bắt buộc `name` (không rỗng, tối đa 255 ký tự), `startDate`, `expectedEndDate` (không sớm hơn `startDate`), và `projectManagerId` (> 0).
- Thẻ xem trước kết quả khởi tạo: hiển thị khách hàng, loại dự án kế thừa từ `contractType`, hạn mức trần kế thừa từ `limitValue`, và trạng thái khởi tạo `RUNNING` (Đang triển khai).
- Chặn và cảnh báo đối với các hợp đồng không còn hiệu lực (khác `ACTIVE`, ví dụ `DRAFT`, `COMPLETED`, `TERMINATED`) theo đúng tiêu chí TC-02 và backend `INVALID_STATE`.
- Nút tiện ích "Gán cho tôi" tự động điền ID người dùng đang đăng nhập vào trường người quản lý dự án.
- Kiểm soát phân quyền chặt chẽ: chỉ Quản lý dự án (`VT-02`) mới thấy nút thao tác và được phép thực hiện tạo dự án (TC-04).

Files changed
- frontend/src/modules/projects/types/projectTypes.ts (khai báo `ProjectStatus`, `ProjectCreateFromContractReq`, `ProjectRes`, `ContractTargetForProject`)
- frontend/src/modules/contracts/types/contractTypes.ts (re-export các kiểu dữ liệu liên quan đến dự án từ hợp đồng)
- frontend/src/modules/projects/api/projectsApi.ts (thêm `createProjectFromContract`, lớp lỗi `ProjectsApiError`)
- frontend/src/modules/contracts/api/contractsApi.ts (re-export `createProjectFromContract`, `ProjectsApiError`)
- frontend/src/modules/projects/validators/projectValidators.ts (thêm `validateProjectCreateForm`)
- frontend/src/modules/projects/validators/__tests__/projectValidators.test.ts (mới, 8 unit tests bao phủ kiểm tra hợp lệ client-side)
- frontend/src/modules/contracts/components/CreateProjectModal.tsx (triển khai hoàn chỉnh modal tạo dự án từ hợp đồng)
- frontend/src/modules/projects/components/ProjectFormModal.tsx (re-export `CreateProjectModal`)
- frontend/src/modules/contracts/__tests__/CreateProjectModal.test.tsx (mới, 9 unit tests bao phủ TC-01 -> TC-05)
- frontend/src/modules/customers/components/CustomerOverviewPanel.tsx (thêm nút "Tạo dự án" và gắn `CreateProjectModal` cho VT-02)
- frontend/src/modules/customers/__tests__/CustomerOverviewPanel.test.tsx (bổ sung test cases cho phân quyền và mở modal trực tiếp)
- frontend/src/assets/styles/index.css (bổ sung styles `.project-modal-card`, `.project-preview-card`, `.project-preview-grid`, `.project-preview-item`)

Acceptance criteria mapping
- NCL-05-CN-001-TC-01: Cho phép Quản lý dự án (VT-02) tạo dự án từ hợp đồng đang hiệu lực (ACTIVE); nhập tên dự án, ngày bắt đầu, ngày kết thúc dự kiến và người quản lý dự án; dự án tạo mới kế thừa khách hàng, loại dự án, hạn mức trần và ở trạng thái RUNNING.
- NCL-05-CN-001-TC-02: Từ chối tạo dự án khi hợp đồng không còn hiệu lực (khác ACTIVE); hiển thị cảnh báo hướng dẫn và ẩn form tạo; xử lý đúng mã lỗi INVALID_STATE từ backend.
- NCL-05-CN-001-TC-03: Bắt lỗi validation client-side khi thiếu tên, thiếu ngày bắt đầu/kết thúc, ngày kết thúc sớm hơn ngày bắt đầu, hoặc thiếu ID người quản lý dự án; hiển thị đúng lỗi VALIDATION_ERROR từ backend.
- NCL-05-CN-001-TC-04: Kiểm soát phân quyền: Nút "Tạo dự án" chỉ hiển thị cho tài khoản có vai trò VT-02; ẩn nút với các vai trò khác và modal tự động kiểm tra, từ chối nếu vai trò không hợp lệ.
- NCL-05-CN-001-TC-05: Xử lý thông báo lỗi từ server khi API thất bại (400 INVALID_STATE, 404 RESOURCE_NOT_FOUND, 403 FORBIDDEN).

Test / QA steps
1. Đăng nhập với tài khoản Quản lý dự án (`role = 'VT-02'`).
2. Mở hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel`), cuộn đến khối Hợp đồng.
3. Trên dòng hợp đồng đang `ACTIVE`, bấm nút "Tạo dự án".
4. Xác nhận modal mở ra, hiển thị thông tin hợp đồng hiện tại và thẻ xem trước kế thừa (khách hàng, loại hợp đồng, hạn mức, trạng thái RUNNING).
5. Nhập tên dự án (ví dụ: "Triển khai ERP ABC"), ngày bắt đầu, ngày kết thúc dự kiến, bấm "Gán cho tôi" hoặc nhập ID người quản lý dự án (ví dụ: 7).
6. Bấm "Tạo dự án" -> lưu thành công, modal đóng và danh sách tổng hợp được làm mới.
7. Thử mở tạo dự án từ hợp đồng có trạng thái khác `ACTIVE` (ví dụ `COMPLETED`) -> xác nhận hiển thị cảnh báo "Chỉ cho phép tạo dự án từ hợp đồng đang còn hiệu lực (ACTIVE)", form tạo bị ẩn.
8. Thử nhập ngày kết thúc dự kiến sớm hơn ngày bắt đầu hoặc bỏ trống các trường bắt buộc -> xác nhận hệ thống báo lỗi chi tiết tương ứng dưới từng trường.
9. Đăng nhập với tài khoản vai trò khác không có `VT-02` (ví dụ chỉ có `VT-05` hoặc `VT-06`) -> nút "Tạo dự án" hoàn toàn không hiển thị.

Merge checklist (for approvers)
- [x] `tsc -b` sạch sẽ, không lỗi kiểu dữ liệu (0 errors).
- [x] `vitest run` pass 100% cả contracts, projects và customer overview (52 tests) cũng như toàn bộ frontend (336/336 tests pass).
- [x] `eslint` sạch sẽ trên toàn bộ các file đã sửa và file mới (0 errors, 0 warnings).
- [x] `vite build` tạo production bundle sạch sẽ (`dist/`).
- [x] Backend `mvn test -Dtest=*Project*` pass 4/4 tests (BUILD SUCCESS).
- [x] Khớp 100% spec `docs/04-api/api-contract.md § NCL-05-CN-001`.
