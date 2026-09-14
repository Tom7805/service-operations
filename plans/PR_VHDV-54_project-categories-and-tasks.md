Title: FE: NCL-05-CN-002 — Chia hạng mục và công việc của dự án (WBS)

Summary
- Xây dựng giao diện cây cơ cấu phân rã công việc (Work Breakdown Structure - WBS) hoàn chỉnh (`WorkBreakdownTree.tsx`) cho phép biểu diễn phân cấp đa tầng: Hạng mục gốc -> Hạng mục con -> Công việc -> Công việc con (Subtasks).
- Phát triển trang chi tiết dự án (`ProjectDetailPage.tsx`) tích hợp xem tổng quan dự án, xem cây WBS, lọc trạng thái, thêm hạng mục gốc/hạng mục con, thêm công việc/việc con, xóa hạng mục rỗng, và nút "Tải lại" dữ liệu.
- Phát triển modal xem và quản lý WBS trực tiếp từ các module khác (`ProjectWbsModal.tsx`), tích hợp vào nút "Xem công việc" trong bảng Dự án tại hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel.tsx`).
- Bổ sung modal thêm hạng mục (`WorkPackageModal.tsx`) hỗ trợ cả tạo hạng mục gốc (`parentId = null`) và hạng mục con (`parentId = parent.id`), kèm trường sắp xếp `sortOrder`.
- Bổ sung modal thêm công việc (`TaskFormModal.tsx`) hỗ trợ tạo công việc trực thuộc hạng mục hoặc công việc con (`parentTaskId = parentTask.id`), kèm lựa chọn thời gian bắt đầu và kết thúc dự kiến.
- Triển khai đầy đủ API clients (`projectsApi.ts` và `tasksApi.ts`):
  - `getProject(projectId)`
  - `getWorkBreakdown(projectId)`
  - `createWorkPackage(projectId, payload)`
  - `createTask(projectId, workPackageId, payload)`
  - `deleteWorkPackage(projectId, workPackageId)`
- Xây dựng bộ kiểm tra hợp lệ client-side (`projectValidators.ts`):
  - `validateWorkPackageForm`: kiểm tra tên hạng mục không rỗng, tối đa 255 ký tự.
  - `validateTaskCreateForm`: kiểm tra tên công việc không rỗng, tối đa 255 ký tự, ngày kết thúc dự kiến không được sớm hơn ngày bắt đầu.
- Kiểm soát phân quyền chặt chẽ theo đặc tả:
  - Xem WBS: Ban giám đốc (`VT-01`), Quản lý dự án (`VT-02`), Nhân viên chuyên môn (`VT-03`). Các vai trò khác (như `VT-04`, `VT-05`) bị chặn truy cập.
  - Thao tác thay đổi WBS (thêm hạng mục, thêm việc, xóa hạng mục): Chỉ Quản lý dự án (`VT-02`) và dự án phải đang ở trạng thái `RUNNING`. Khi dự án đã đóng (`CLOSED`, `COMPLETED`), hiển thị cảnh báo và chuyển sang chế độ chỉ đọc.
- Bổ sung hệ thống CSS chuẩn hóa (`index.css`): các class `.wbs-tree`, `.wbs-package-node`, `.wbs-package-node--nested`, `.wbs-task-row`, `.wbs-badge--*`, ...

Files changed
- frontend/src/modules/projects/types/taskTypes.ts (mới: `TaskStatus`, `TaskRes`, `TaskCreateReq`, `WorkPackageReq`, `WorkBreakdownRes`)
- frontend/src/modules/projects/types/projectTypes.ts (re-export task types cùng các kiểu dữ liệu dự án)
- frontend/src/modules/projects/api/projectsApi.ts (bổ sung API WBS, task, work-package, deleteWorkPackage)
- frontend/src/modules/projects/api/tasksApi.ts (re-export API tasks và WBS)
- frontend/src/modules/projects/validators/projectValidators.ts (thêm `validateWorkPackageForm`, `validateTaskCreateForm`)
- frontend/src/modules/projects/validators/__tests__/projectWbsValidators.test.ts (mới, 8 unit tests kiểm tra validation WBS)
- frontend/src/modules/projects/components/WorkPackageModal.tsx (mới: modal thêm hạng mục gốc và hạng mục con)
- frontend/src/modules/projects/components/TaskFormModal.tsx (mới: modal thêm công việc và công việc con)
- frontend/src/modules/projects/components/WorkBreakdownTree.tsx (mới: cây phân cấp WBS mở rộng/thu gọn, badge trạng thái, phân quyền thao tác)
- frontend/src/modules/projects/components/ProjectWbsModal.tsx (mới: modal quản lý WBS nhúng nhanh)
- frontend/src/modules/projects/pages/ProjectDetailPage.tsx (mới: trang chi tiết dự án và WBS toàn diện)
- frontend/src/modules/customers/components/CustomerOverviewPanel.tsx (thêm nút "Xem công việc" và nhúng `ProjectWbsModal`)
- frontend/src/modules/projects/__tests__/WorkBreakdownTree.test.tsx (mới, 7 unit tests bao phủ cây WBS, đóng/mở, phân quyền VT-02 vs VT-01/03, dự án đóng)
- frontend/src/modules/projects/__tests__/ProjectDetailPage.test.tsx (mới, 5 unit tests bao phủ trang chi tiết dự án, phân quyền, cảnh báo dự án đóng, bắt lỗi API)
- frontend/src/modules/customers/__tests__/CustomerOverviewPanel.test.tsx (bổ sung unit tests cho nút "Xem công việc" và modal WBS)
- frontend/src/assets/styles/index.css (bổ sung bộ style đồng bộ cho WBS và các modal liên quan)

Acceptance criteria mapping
- NCL-05-CN-002-TC-01: Quản lý dự án (VT-02) tạo hạng mục công việc (Work Package) thuộc dự án đang mở (RUNNING); hỗ trợ cả hạng mục gốc và hạng mục con; trường tên không được để trống, tối đa 255 ký tự.
- NCL-05-CN-002-TC-02: Quản lý dự án (VT-02) tạo công việc (Task) thuộc hạng mục; hỗ trợ tạo công việc con (Subtask); ngày kết thúc dự kiến không được sớm hơn ngày bắt đầu. Trạng thái mặc định ban đầu là TODO.
- NCL-05-CN-002-TC-03: Xem cây phân rã công việc (WBS) dạng phân cấp đa tầng (hạng mục -> công việc -> việc con), hiển thị đầy đủ tên, trạng thái (TODO, IN_PROGRESS, WAITING_APPROVAL, DONE) và ngày thực hiện. Cho phép mở rộng / thu gọn các nhánh.
- NCL-05-CN-002-TC-04: Xóa hạng mục công việc rỗng (không chứa công việc và không chứa hạng mục con); hệ thống ngăn chặn xóa và hiển thị cảnh báo nếu hạng mục còn công việc hoặc còn hạng mục con.
- NCL-05-CN-002-TC-05: Kiểm soát phân quyền: Chỉ VT-01, VT-02, VT-03 mới được quyền xem WBS; các vai trò khác nhận thông báo từ chối truy cập. Chỉ VT-02 mới được quyền thêm/sửa/xóa hạng mục và công việc; VT-01 và VT-03 ở chế độ chỉ đọc (Read-only).
- NCL-05-CN-002-TC-06: Ngăn chặn chỉnh sửa khi dự án đã đóng hoặc tạm dừng (khác RUNNING); hiển thị cảnh báo trạng thái dự án và vô hiệu hóa các nút thêm/xóa.

Test / QA steps
1. Đăng nhập với tài khoản Quản lý dự án (`role = 'VT-02'`).
2. Mở hồ sơ tổng hợp khách hàng (`CustomerOverviewPanel`), cuộn đến khối "Dự án".
3. Nhấp vào nút "Xem công việc" tại một dòng dự án đang `RUNNING`.
4. Xác nhận modal `ProjectWbsModal` hiển thị thông tin dự án và cây WBS.
5. Bấm "+ Thêm hạng mục gốc", nhập tên hạng mục (ví dụ "Giai đoạn 1: Khảo sát"), thứ tự sắp xếp -> bấm "Thêm hạng mục" -> hạng mục hiển thị ngay trên cây WBS.
6. Trên hạng mục vừa tạo, bấm "+ Mục con", nhập "Khảo sát hạ tầng" -> mục con hiển thị thụt lề dưới hạng mục cha.
7. Bấm "+ Thêm việc" trên hạng mục, nhập tên việc "Thu thập thông tin máy chủ", ngày bắt đầu, ngày kết thúc dự kiến -> bấm "Thêm công việc" -> công việc hiển thị kèm badge trạng thái `Chờ thực hiện (TODO)`.
8. Bấm "+ Việc con" trên công việc, nhập "Kiểm tra cấu hình RAM/CPU" -> việc con hiển thị lồng dưới công việc cha.
9. Bấm icon mũi tên để thu gọn / mở rộng các nhánh hạng mục.
10. Thử xóa hạng mục có chứa công việc hoặc mục con -> nút Xóa bị ẩn theo logic bảo toàn dữ liệu; tạo một hạng mục rỗng và bấm "Xóa" -> hệ thống xác nhận và xóa thành công.
11. Đăng nhập với tài khoản Ban giám đốc (`VT-01`) hoặc Nhân viên chuyên môn (`VT-03`) -> vẫn xem được cây WBS nhưng các nút "+ Thêm việc", "+ Mục con", "Xóa" hoàn toàn bị ẩn (chế độ chỉ đọc).
12. Đăng nhập với tài khoản Kế toán (`VT-05`) hoặc Kinh doanh (`VT-04`) -> nút "Xem công việc" hoàn toàn không hiển thị trong bảng Dự án; nếu truy cập trực tiếp trang chi tiết dự án sẽ hiển thị màn hình từ chối quyền truy cập (403).
13. Mở dự án có trạng thái đã đóng (ví dụ `COMPLETED` hoặc `CLOSED`) -> hiển thị cảnh báo màu vàng và khóa toàn bộ chức năng chỉnh sửa WBS.

Merge checklist (for approvers)
- [x] `tsc -b` pass sạch sẽ 0 lỗi kiểu dữ liệu.
- [x] `vitest run` pass 100% toàn bộ test suite (54 test files, 358/358 tests passed).
- [x] `eslint` kiểm tra toàn bộ các file mới và sửa đổi đạt 0 lỗi, 0 cảnh báo.
- [x] `vite build` tạo production bundle sạch sẽ (`dist/`).
- [x] Backend `mvn test -Dtest=*Project*` pass 41/41 tests (BUILD SUCCESS).
- [x] Khớp 100% spec backend `docs/04-api/api-contract.md § NCL-05-CN-002` và tiêu chuẩn thiết kế `DESIGN.md`.
