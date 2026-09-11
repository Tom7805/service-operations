Handover notes — VHDV-60 (NCL-05-CN-008)

Story: NCL-05-CN-008 — Quản lý mốc tiến độ của dự án
Nhánh: VHDV-60-manage-project-milestones
Tác vụ: Bổ sung Frontend hoàn chỉnh cho phần backend đã có sẵn trên nhánh (migration, entity, service, controller, test, docs), đảm bảo đầy đủ tiêu chí chấp thuận (TC-01, TC-02, TC-03), khớp 100% với Backend hiện tại.

Bối cảnh nhánh (quan trọng cho người tiếp nhận)
- Nhánh `VHDV-60` khi mở lên ban đầu chỉ có phần backend (migration `V52`, entity/repository/service/controller, test, tài liệu API) — toàn bộ frontend của module `projects` (kể cả các file skeleton như `ProjectDetailPage.tsx`, `WorkBreakdownTree.tsx`...) vẫn đang **rỗng**, vì các story trước đó (NCL-05-CN-001, 002, 006, 007) mới chỉ merge backend vào `develop`/nhánh gốc, phần frontend của chúng nằm riêng trên `origin/VHDV-59-create-project-from-template` và **chưa merge**.
- Nhánh `origin/develop-backup` lại đã gộp sẵn cả backend lẫn frontend của các story đó (bao gồm cả backend milestone của chính nhánh này). Để có nền `ProjectDetailPage`/`WorkBreakdownTree` thật mà gắn tính năng mốc tiến độ vào, đã **fast-forward merge `origin/develop-backup`** vào nhánh này (`git merge --ff-only origin/develop-backup`) trước khi code — thao tác này an toàn vì `develop-backup` là tập cha chứa trọn vẹn lịch sử của `VHDV-60` cộng thêm các commit đó, không có phân nhánh cần resolve conflict.
- Vì vậy diff của nhánh này so với `develop-backup` gốc chỉ còn đúng phần việc của story NCL-05-CN-008 (liệt kê ở dưới); phần nền tảng project/WBS không phải do phiên làm việc này tạo ra.

What changed (frontend NCL-05-CN-008)
- Đã đọc kỹ backend hiện có: `ProjectMilestoneController` (5 endpoint, `@PreAuthorize("hasRole('VT-02')")` toàn bộ), `ProjectMilestoneServiceImpl` (rule: dự án phải `RUNNING` và đã có cây công việc mới tạo được mốc; `status`/`daysLate` tính động khi đọc, không lưu DB; ngày thực tế không được ở tương lai), DTO `ProjectMilestoneReq`/`ProjectMilestoneCompleteReq`/`ProjectMilestoneRes`, và mục `NCL-05-CN-008` trong `docs/04-api/api-contract.md`.
- Kiểu dữ liệu (`frontend/src/modules/projects/types/projectTypes.ts`): thêm `MilestoneProgressStatus`, `ProjectMilestoneItemRes`, `ProjectMilestoneRes`, `ProjectMilestoneReq`, `ProjectMilestoneCompleteReq` — khớp từng trường JSON ví dụ trong tài liệu API.
- API client (`frontend/src/modules/projects/api/projectsApi.ts`): `getMilestones`, `createMilestone`, `updateMilestone`, `completeMilestone`, `deleteMilestone` — gọi đúng path `/projects/{projectId}/milestones[...]`.
- Validator (`frontend/src/modules/projects/validators/projectValidators.ts`): `validateMilestoneForm` (tên, ngày kế hoạch, ≥1 hạng mục) và `validateMilestoneCompleteForm` (ngày thực tế bắt buộc + không ở tương lai — chặn phía client trước khi backend trả `INVALID_STATE`).
- Component:
  - `ProjectMilestoneTimeline.tsx` (trước đây là file rỗng dành sẵn cho story này): bảng theo dõi tiến độ — tên, mô tả, hạng mục phải hoàn thành (badge công việc), ngày kế hoạch, ngày thực tế, trạng thái (`status-pill` tái dùng 3 biến thể màu có sẵn: `--active`/`--inactive`/`--locked`), và các thao tác Sửa/Hoàn thành/Xóa theo quyền.
  - `MilestoneFormModal.tsx` (mới): modal tạo/sửa mốc, làm phẳng cây WBS (`wbs` prop) thành danh sách công việc kèm breadcrumb hạng mục cha, dùng UI `roles-checklist`/`checklist-item` đã có sẵn trong hệ thống (không thêm CSS mới) để chọn nhiều công việc.
  - `MilestoneCompleteModal.tsx` (mới): modal nhỏ ghi nhận ngày thực tế hoàn thành.
- Tích hợp vào `ProjectDetailPage.tsx`: gắn `<ProjectMilestoneTimeline projectId wbs canEdit isProjectOpen onNotify={showToast} />` ngay dưới khối cây công việc (WBS), tái dùng toàn bộ state/toast đã có sẵn của trang thay vì tạo cơ chế thông báo riêng.
- Cập nhật `frontend/src/modules/projects/__tests__/ProjectDetailPage.test.tsx`: bổ sung 5 hàm milestone vào `vi.mock('../api/projectsApi', ...)` và mock mặc định `getMilestones` trả `[]` trong `beforeEach` — bắt buộc phải làm để không phá vỡ 9 test cũ của trang này (trang giờ luôn gọi thêm `getMilestones` khi render).

Kiểm thử tự động
- `projectValidators.test.ts` (+8 unit tests mới): dữ liệu hợp lệ, tên rỗng/quá dài, thiếu ngày kế hoạch, chưa chọn hạng mục nào (`validateMilestoneForm`); ngày thực tế hợp lệ/rỗng/ở tương lai (`validateMilestoneCompleteForm`).
- `ProjectMilestoneTimeline.test.tsx` (mới, 11 unit tests):
  - TC-02: hiển thị đúng 3 trạng thái `DONE`/`ON_TRACK`/`LATE` kèm số ngày trễ; trạng thái rỗng khi chưa có mốc nào.
  - TC-03: ẩn toàn bộ nút thao tác khi `canEdit=false`; ẩn khi dự án đã đóng (`isProjectOpen=false`).
  - Vô hiệu hóa nút thêm khi dự án chưa có công việc nào trong cây công việc.
  - TC-01: mở form, chọn hạng mục, tạo mốc thành công (kiểm tra đúng payload gửi lên `createMilestone`); báo lỗi khi chưa chọn hạng mục nào.
  - Sửa mốc: form điền sẵn đúng dữ liệu (kể cả hạng mục đã chọn), gọi `updateMilestone` đúng `milestoneId`.
  - Hoàn thành: chỉ hiện nút với mốc chưa `DONE`, gọi `completeMilestone` đúng payload.
  - Xóa: gọi `deleteMilestone` khi xác nhận, không gọi khi hủy xác nhận.
  - Xử lý lỗi tải danh sách từ server (`ProjectsApiError`).
- Kết quả kiểm thử:
  - Frontend: 57 test files passed, 402/402 tests passed (100%) — chạy toàn bộ `vitest run`, không chỉ riêng module `projects`.
  - TypeScript: `tsc -b` pass 0 lỗi.
  - ESLint: `npx eslint src/modules/projects` pass 0 lỗi/0 cảnh báo. `npx eslint .` toàn repo còn 6 lỗi tồn tại từ trước ở `customers`/`departments`/`opportunities`/`users` — không liên quan và không do thay đổi này gây ra (không sửa vì ngoài phạm vi story).
  - Vite build: `vite build` thành công, bundle production không lỗi.

Giới hạn kiểm thử — cần lưu ý khi bàn giao
- **Chưa click-through được trên trình duyệt thật.** `ProjectDetailPage` (nơi gắn tính năng này) hiện chưa được import/route vào `App.tsx` ở bất kỳ nhánh nào tính đến `develop-backup` — đây là khoảng trống điều hướng đã tồn tại từ trước khi có story này (`ProjectListPage` cũng vậy). Việc gắn `ProjectDetailPage` vào điều hướng chính là một quyết định UX/luồng thuộc phạm vi story khác (ví dụ: từ đâu người dùng vào được trang chi tiết dự án — từ trang danh sách dự án, từ hồ sơ khách hàng, hay từ hợp đồng?), nên phiên làm việc này **không tự ý thêm** để tránh lấn phạm vi. Người nhận bàn giao cần cân nhắc bổ sung điều hướng này (ở nhánh này hoặc một nhánh tích hợp riêng) trước khi demo trực tiếp trên UI thật; toàn bộ logic nghiệp vụ đã được xác minh đầy đủ qua bộ test tự động (render + tương tác thật qua Testing Library) thay thế cho việc click tay.

Sẵn sàng merge
- Nhánh `VHDV-60-manage-project-milestones` đã hoàn tất phần frontend theo tiêu chí chấp thuận NCL-05-CN-008 (TC-01, TC-02, TC-03) và sẵn sàng để merge vào `develop-backup`, với lưu ý duy nhất ở mục "Giới hạn kiểm thử" phía trên.
