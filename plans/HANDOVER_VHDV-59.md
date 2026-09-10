Handover notes — VHDV-59 (NCL-05-CN-007)

Story: NCL-05-CN-007 — Tạo dự án từ mẫu
Nhánh: VHDV-59-create-project-from-template
Tác vụ: Bổ sung Frontend hoàn chỉnh, đảm bảo đầy đủ tiêu chí chấp thuận (TC-01, TC-02, TC-03, TC-04), khớp 100% với Backend hiện tại.

What changed
- Đã phân tích chi tiết API backend hiện có:
  - `GET /contracts/{contractId}/projects/from-template`: Lấy danh sách mẫu dự án đang hoạt động (yêu cầu vai trò VT-02).
  - `POST /contracts/{contractId}/projects/from-template`: Tạo dự án từ mẫu và tự động nhân bản WBS (hạng mục + công việc mẫu) sang dự án mới (yêu cầu vai trò VT-02, chỉ hợp đồng ACTIVE).
  - `DELETE /projects/{projectId}/work-packages/{workPackageId}`: Xóa gói công việc rỗng trên dự án để xác minh tính độc lập của template (TC-02).
  - Phân quyền: `@PreAuthorize("hasRole('VT-02')")` (Quản lý dự án). Non-VT-02 nhận lỗi 403 Forbidden kèm ghi nhận audit log nhạy cảm.
- Cập nhật kiểu dữ liệu:
  - `frontend/src/modules/projects/types/taskTypes.ts`: Bổ sung `TaskStatus`, `TaskRes`, `WorkBreakdownRes`.
  - `frontend/src/modules/projects/types/projectTypes.ts`: Bổ sung `ProjectStatus`, `ProjectTemplateRes`, `ProjectCreateFromTemplateReq`, `ProjectRes`, `ContractTargetForProject`.
- Bổ sung API client tại `frontend/src/modules/projects/api/projectsApi.ts` & `tasksApi.ts`:
  - `fetchProjectTemplates(contractId)`
  - `createProjectFromTemplate(contractId, payload)`
  - `getWorkBreakdown(projectId)`
  - `deleteWorkPackage(projectId, workPackageId)`
- Viết bộ validator client-side tại `frontend/src/modules/projects/validators/projectValidators.ts`:
  - `validateProjectCreateFromTemplateForm(...)`: kiểm tra bắt buộc templateId, tên dự án, ngày bắt đầu, ngày kết thúc dự kiến >= ngày bắt đầu, và projectManagerId.
- Hoàn thiện các component:
  - `WorkBreakdownTree.tsx`: Cây hiển thị WBS phân cấp (hạng mục, công việc, số giờ định mức, badge trạng thái), hỗ trợ xóa gói công việc rỗng độc lập.
  - `CreateProjectFromTemplateModal.tsx`: Modal tạo dự án từ mẫu với danh sách mẫu, thẻ preview các hạng mục/công việc mẫu, form nhập liệu có validation, thông báo lỗi/thành công và hiển thị cây WBS kết quả.
  - `ProjectFormModal.tsx`: Re-export `CreateProjectFromTemplateModal`.
  - `ProjectFromTemplatePage.tsx`: Trang độc lập hỗ trợ tạo dự án từ mẫu với kiểm tra quyền `VT-02`.
- Tích hợp vào `CustomerOverviewPanel.tsx`:
  - Thêm nút "Tạo từ mẫu" tại mỗi dòng hợp đồng, chỉ hiển thị cho tài khoản có vai trò `VT-02` trên hợp đồng `ACTIVE`.
  - Mở `CreateProjectFromTemplateModal` và làm mới danh sách sau khi tạo thành công.
- Cập nhật CSS tại `frontend/src/assets/styles/index.css` với các styles cho preview, WBS tree, và modal card.

Kiểm thử tự động
- `projectValidators.test.ts` (8 unit tests):
  - Kiểm tra hợp lệ khi dữ liệu đầy đủ.
  - Kiểm tra bắt buộc templateId, tên dự án, độ dài tên <= 255 ký tự.
  - Kiểm tra ngày bắt đầu, ngày kết thúc dự kiến, ràng buộc ngày kết thúc >= ngày bắt đầu.
  - Kiểm tra bắt buộc projectManagerId.
- `CreateProjectFromTemplateModal.test.tsx` (7 unit tests):
  - TC-01: Tải danh sách mẫu, chọn mẫu, điền form và tạo dự án thành công, hiển thị WBS tree.
  - TC-02: Template isolation - xóa gói công việc trên dự án vừa tạo độc lập mà không ảnh hưởng mẫu.
  - TC-03: Kiểm tra phân quyền - chặn vai trò non-VT-02 (ví dụ VT-05) với banner từ chối truy cập.
  - TC-04a: Báo lỗi khi thiếu mẫu dự án hoặc ngày kết thúc dự kiến trước ngày bắt đầu.
  - TC-04b: Cảnh báo khi hợp đồng không ở trạng thái ACTIVE (ví dụ COMPLETED).
  - TC-05: Xử lý hiển thị lỗi khi API trả về mã lỗi từ máy chủ.
- `CustomerOverviewPanel.test.tsx` (16 unit tests):
  - Kiểm tra nút "Tạo từ mẫu" hiển thị cho vai trò `VT-02` trên hợp đồng `ACTIVE`.
  - Kiểm tra nút "Tạo từ mẫu" bị ẩn với các vai trò khác (như `VT-05`).
  - Kiểm tra nút "Tạo từ mẫu" bị ẩn với hợp đồng khác `ACTIVE` (như `TERMINATED`).
  - Kiểm tra bấm nút mở đúng `CreateProjectFromTemplateModal`.
- Kết quả kiểm thử:
  - Frontend: 51 test files passed, 334/334 tests passed (100%).
  - TypeScript: `tsc -b` pass 0 lỗi.
  - ESLint: pass 0 lỗi trên toàn bộ các file liên quan.
  - Vite build: build production bundle thành công.
  - Backend: Maven test `*ProjectTemplate*` pass 7/7 tests (BUILD SUCCESS).

Sẵn sàng merge
- Nhánh `VHDV-59-create-project-from-template` đã hoàn tất 100% tiêu chí chấp thuận và sẵn sàng để merge vào `develop`.
