Title: FE: NCL-05-CN-007 — Tạo dự án từ mẫu

Summary
- Xây dựng giao diện tạo dự án từ mẫu (`CreateProjectFromTemplateModal.tsx`) mở từ nút "Tạo từ mẫu" tại mỗi dòng hợp đồng trong hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel.tsx`) và trang chuyên biệt (`ProjectFromTemplatePage.tsx`).
- Bổ sung API client `fetchProjectTemplates(contractId)` (GET), `createProjectFromTemplate(contractId, payload)` (POST), `getWorkBreakdown(projectId)` (GET), và `deleteWorkPackage(projectId, workPackageId)` (DELETE) gọi trực tiếp endpoint `GET/POST /contracts/{contractId}/projects/from-template` và `DELETE /projects/{projectId}/work-packages/{workPackageId}` khớp 100% với backend (`ProjectTemplateController`, `ProjectTemplateServiceImpl`, DTO `ProjectCreateFromTemplateReq`, `ProjectTemplateRes`, `WorkBreakdownRes`).
- Xây dựng bộ kiểm tra hợp lệ phía client (`projectValidators.ts`): kiểm tra bắt buộc `templateId > 0` (TC-01), tên dự án không rỗng và tối đa 255 ký tự, ngày bắt đầu hợp lệ, ngày kết thúc dự kiến >= ngày bắt đầu (TC-04), và mã quản lý dự án `projectManagerId > 0`.
- Thẻ xem trước kết quả mẫu realtime: khi chọn mẫu dự án, hiển thị danh sách các hạng mục (Work Packages) và công việc (Tasks) mẫu kèm số giờ định mức (budgetHours) giúp Quản lý dự án nắm rõ cấu trúc WBS trước khi khởi tạo.
- Cây WBS độc lập (`WorkBreakdownTree.tsx`): Sau khi khởi tạo dự án thành công, hiển thị toàn bộ cây hạng mục và công việc đã được nhân bản vào dự án mới; hỗ trợ kiểm tra xóa hạng mục rỗng độc lập trên dự án (`onDeletePackage`) mà không làm ảnh hưởng đến mẫu gốc (TC-02).
- Chặn và cảnh báo hợp đồng không khả dụng: Nếu hợp đồng khác `ACTIVE` (ví dụ `DRAFT`, `TERMINATED`, `COMPLETED`), hiển thị banner cảnh báo và ẩn form tạo để ngăn lỗi `INVALID_STATE` từ backend.
- Kiểm soát phân quyền chặt chẽ (TC-03): Chỉ Quản lý dự án (`VT-02`) mới thấy nút thao tác và được phép thực hiện tạo dự án từ mẫu; các vai trò khác (như `VT-05`, `VT-04`, `VT-03`...) nhận thông báo từ chối truy cập và backend trả về 403 Forbidden kèm ghi nhận audit log nhạy cảm.

Files changed
- frontend/src/modules/projects/types/taskTypes.ts (bổ sung `TaskStatus`, `TaskRes`, `WorkBreakdownRes`)
- frontend/src/modules/projects/types/projectTypes.ts (bổ sung `ProjectStatus`, `ProjectTemplateRes`, `ProjectCreateFromTemplateReq`, `ProjectRes`, `ContractTargetForProject`)
- frontend/src/modules/projects/api/projectsApi.ts (thêm `fetchProjectTemplates`, `createProjectFromTemplate`, `getWorkBreakdown`, `deleteWorkPackage`, `ProjectsApiError`)
- frontend/src/modules/projects/api/tasksApi.ts (re-export các hàm API)
- frontend/src/modules/projects/validators/projectValidators.ts (thêm `validateProjectCreateFromTemplateForm`)
- frontend/src/modules/projects/validators/__tests__/projectValidators.test.ts (mới, 8 unit tests kiểm tra validation)
- frontend/src/modules/projects/components/WorkBreakdownTree.tsx (triển khai cây WBS hiển thị hạng mục, công việc, giờ định mức, thao tác xóa gói công việc)
- frontend/src/modules/projects/components/CreateProjectFromTemplateModal.tsx (mới, triển khai đầy đủ modal chọn mẫu, preview, validate, tạo dự án và hiển thị WBS kết quả)
- frontend/src/modules/projects/components/ProjectFormModal.tsx (re-export `CreateProjectFromTemplateModal`)
- frontend/src/modules/projects/components/__tests__/ (hoặc `projects/__tests__/CreateProjectFromTemplateModal.test.tsx` mới, 7 unit tests bao phủ TC-01 -> TC-04)
- frontend/src/modules/projects/pages/ProjectFromTemplatePage.tsx (triển khai trang chuyên biệt tạo dự án từ mẫu)
- frontend/src/modules/customers/components/CustomerOverviewPanel.tsx (thêm nút "Tạo từ mẫu" và tích hợp `CreateProjectFromTemplateModal` cho VT-02 trên hợp đồng ACTIVE)
- frontend/src/modules/customers/__tests__/CustomerOverviewPanel.test.tsx (bổ sung 4 unit tests kiểm tra phân quyền VT-02 và luồng mở modal)
- frontend/src/assets/styles/index.css (bổ sung styles `.project-modal-card`, `.project-preview-*`, `.wbs-tree`, `.wbs-package-*`, `.wbs-task-*`, `.wbs-badge-*`)

Acceptance criteria mapping
- NCL-05-CN-007-TC-01: Quản lý dự án (VT-02) chọn mẫu dự án cho hợp đồng ACTIVE; hệ thống nhân bản đầy đủ danh sách hạng mục và công việc mẫu sang dự án mới với trạng thái khởi tạo (TODO/INIT).
- NCL-05-CN-007-TC-02: Thay đổi trên dự án vừa tạo (như xóa gói công việc rỗng) không làm ảnh hưởng đến dữ liệu mẫu ban đầu; đảm bảo tính toàn vẹn và độc lập của template.
- NCL-05-CN-007-TC-03: Kiểm soát phân quyền: Chỉ Quản lý dự án (VT-02) được phép tạo dự án từ mẫu; nhân viên kỹ thuật (VT-05) hoặc các vai trò khác bị từ chối truy cập (403 Forbidden) và ghi log nhạy cảm.
- NCL-05-CN-007-TC-04: Bắt lỗi validation khi thiếu mẫu dự án (templateId <= 0), thiếu tên, hoặc ngày kết thúc dự kiến trước ngày bắt đầu; hiển thị thông báo lỗi chi tiết trên form và xử lý đúng mã lỗi từ backend.

Test / QA steps
1. Đăng nhập với tài khoản Quản lý dự án (`role = 'VT-02'`).
2. Mở hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel`), cuộn đến khối Hợp đồng.
3. Trên dòng hợp đồng đang `ACTIVE`, bấm nút "Tạo từ mẫu".
4. Xác nhận modal mở ra, tải danh sách mẫu dự án đang hoạt động qua `GET /contracts/{contractId}/projects/from-template`.
5. Chọn một mẫu dự án (ví dụ: "Mẫu Triển khai ERP Doanh nghiệp") -> xác nhận thẻ xem trước tự động hiển thị danh sách các hạng mục và công việc mẫu.
6. Nhập tên dự án, ngày bắt đầu, ngày kết thúc dự kiến, mã Quản lý dự án.
7. Bấm "Tạo dự án từ mẫu" -> gửi `POST /contracts/{contractId}/projects/from-template`, sau khi thành công hiển thị cây WBS độc lập của dự án vừa tạo.
8. Thử thao tác xóa một hạng mục rỗng trên cây WBS dự án -> xác nhận xóa thành công trên dự án và mẫu gốc vẫn giữ nguyên cấu trúc (TC-02).
9. Thử nhập ngày kết thúc dự kiến trước ngày bắt đầu hoặc bỏ trống tên dự án -> xác nhận hiển thị lỗi validation tương ứng (TC-04).
10. Đăng nhập với tài khoản Nhân viên kỹ thuật (`VT-05`) -> nút "Tạo từ mẫu" hoàn toàn không hiển thị, nếu mở modal sẽ thấy cảnh báo từ chối truy cập (TC-03).

Merge checklist (for approvers)
- [x] `tsc -b` sạch sẽ, không lỗi kiểu dữ liệu (0 errors).
- [x] `vitest run` pass 100% (51 test files, 334/334 tests pass).
- [x] `eslint` sạch sẽ trên toàn bộ các file đã sửa và file mới (0 errors, 0 warnings).
- [x] `vite build` tạo production bundle sạch sẽ.
- [x] Backend `mvn test -Dtest=*ProjectTemplate*` pass 7/7 tests (BUILD SUCCESS).
- [x] Khớp 100% spec `docs/04-api/api-contract.md § NCL-05-CN-007`.
