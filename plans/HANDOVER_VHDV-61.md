Handover notes — VHDV-61 (NCL-05-CN-009)

Story: NCL-05-CN-009 — Quản lý rủi ro dự án
Nhánh: VHDV-61-manage-project-risks
Tác vụ: Bổ sung Frontend hoàn chỉnh cho phần backend đã có sẵn trên nhánh (entity, service, controller, test, docs), đảm bảo đầy đủ tiêu chí chấp thuận (TC-01 → TC-04), khớp 100% với Backend hiện tại.

Bối cảnh nhánh (giống VHDV-60, tiếp diễn cùng mô hình)
- Nhánh `VHDV-61` khi mở lên chỉ có phần backend rủi ro (`ProjectRiskController`, `ProjectRiskServiceImpl`, DTO, enum `RiskLevel`/`RiskStatus`, test, tài liệu API) — phần frontend nền tảng của module `projects` (`ProjectDetailPage`, `WorkBreakdownTree`...) không có trên nhánh này.
- Đã fast-forward merge `origin/develop-backup` vào nhánh (`git merge --ff-only origin/develop-backup`) trước khi code — an toàn vì `develop-backup` là tập cha chứa trọn lịch sử `VHDV-61` cộng thêm frontend nền tảng của các story trước (bao gồm cả phần frontend milestone NCL-05-CN-008 đã merge ở PR trước đó). Diff của nhánh này so với `develop-backup` gốc chỉ còn đúng phần việc NCL-05-CN-009 (liệt kê ở dưới).

What changed (frontend NCL-05-CN-009)
- Đọc kỹ backend: `ProjectRiskController` (5 endpoint, `@PreAuthorize("hasRole('VT-02')")` trên **từng method kể cả GET** — khác milestone/WBS vốn mở quyền xem cho VT-01/VT-03), `ProjectRiskServiceImpl` (rule: dự án phải `RUNNING`; người theo dõi phải là tài khoản `ACTIVE`; `score`/`severity` tính động từ `impact.weight × likelihood.weight`, không lưu DB), DTO `ProjectRiskReq`/`ProjectRiskStatusReq`/`ProjectRiskRes`, và mục `NCL-05-CN-009` trong `docs/04-api/api-contract.md`.
- Phát hiện quan trọng: vai trò Quản lý dự án (`VT-02`) **không** có quyền gọi `GET /users` (endpoint đó chỉ dành `VT-07`) để tra cứu danh sách tài khoản làm người theo dõi. Đã kiểm tra codebase và xác nhận đây là hạn chế đã tồn tại từ trước — `CreateProjectModal.tsx` (chọn `projectManagerId`) cũng giải quyết bằng cách cho nhập trực tiếp id số + nút "gán cho tôi". `RiskFormModal.tsx` áp dụng đúng quy ước này cho `watcherId` (nút "Theo dõi bởi tôi").
- Kiểu dữ liệu (`projectTypes.ts`): thêm `RiskLevel`, `RiskStatus`, `ProjectRiskRes`, `ProjectRiskReq`, `ProjectRiskStatusReq`.
- API client (`projectsApi.ts`): `getRisks`, `createRisk`, `updateRisk`, `changeRiskStatus`, `deleteRisk`.
- Validator (`projectValidators.ts`): `validateRiskForm` — mô tả bắt buộc, tác động/khả năng xảy ra bắt buộc, người theo dõi phải có id hợp lệ; biện pháp giảm thiểu tùy chọn (khớp `ProjectRiskReq` backend).
- Trang (`pages/ProjectRiskPage.tsx`, trước đây là file rỗng dành sẵn cho story này): bảng theo dõi rủi ro tự fetch `project` + `risks` độc lập (giống mô hình `ProjectDetailPage`), cột điểm/mức độ dùng lại class `.badge`/`.badge--green/gold/pink` có sẵn, cột trạng thái dùng `<select>` đổi trực tiếp khi dự án còn mở (gọi API ngay `onChange`) hoặc `.status-pill` tĩnh khi đã đóng/không có quyền sửa.
- Modal (`components/RiskFormModal.tsx`, trước đây rỗng): dùng `<select>` (`.form-select` — class đã có sẵn, dùng chung style với `.form-input`) cho tác động/khả năng xảy ra, không dựng combobox tùy chỉnh mới vì không cần danh sách động.
- Tích hợp tối thiểu vào `ProjectDetailPage.tsx`: thêm prop `onOpenRisks?: (projectId) => void` và nút "Rủi ro dự án" (chỉ hiện khi có callback **và** vai trò VT-02) — theo đúng mẫu `onBack`/`onOpenActivities` đã dùng cho điều hướng giữa các trang trong `App.tsx`, không tự ý thêm route cứng hay đoán trước cách nav sẽ được thiết kế.

Kiểm thử tự động
- `projectValidators.test.ts` (+5 unit tests): dữ liệu hợp lệ có/không biện pháp giảm thiểu, mô tả rỗng/khoảng trắng, thiếu tác động/khả năng xảy ra, thiếu người theo dõi hoặc id ≤ 0.
- `ProjectRiskPage.test.tsx` (mới, 11 unit tests):
  - TC-03: Access Denied ngay lập tức cho vai trò khác VT-02 (không gọi `getRisks`) — khác milestone (chỉ ẩn nút, vẫn xem được).
  - TC-02: hiển thị đúng điểm/mức độ, tên/id người theo dõi.
  - Trạng thái rỗng khi chưa có rủi ro.
  - Dự án đã đóng: ẩn toàn bộ nút thao tác, cột trạng thái chuyển sang badge tĩnh.
  - TC-01: mở form, điền dữ liệu, ghi nhận rủi ro thành công (kiểm tra đúng payload); nút "Theo dõi bởi tôi"; báo lỗi khi thiếu trường bắt buộc.
  - Sửa rủi ro: form điền sẵn đúng dữ liệu, gọi `updateRisk` đúng `riskId`.
  - Đổi trạng thái qua `<select>`, gọi `changeRiskStatus` đúng payload.
  - Xóa: gọi `deleteRisk` khi xác nhận, không gọi khi hủy.
  - Xử lý lỗi tải dữ liệu từ server.
- `ProjectDetailPage.test.tsx` (+2 unit tests): nút "Rủi ro dự án" gọi đúng `onOpenRisks(projectId)`; ẩn khi thiếu callback hoặc vai trò không phải VT-02.
- Kết quả kiểm thử:
  - Frontend: 58 test files passed, 420/420 tests passed (100%) — chạy toàn bộ `vitest run`.
  - TypeScript: `tsc -b` pass 0 lỗi.
  - ESLint: `npx eslint src/modules/projects` pass 0 lỗi/0 cảnh báo.
  - Vite build: thành công, bundle production không lỗi.

Giới hạn kiểm thử — cần lưu ý khi bàn giao
- Giống VHDV-60: **chưa click-through được trên trình duyệt thật** vì `ProjectDetailPage`/`ProjectRiskPage` chưa có lối vào từ điều hướng chính (`App.tsx`) ở bất kỳ nhánh nào tính đến `develop-backup`. Đã chuẩn bị sẵn điểm tích hợp (`onOpenRisks` prop) để bất kỳ ai làm story điều hướng chính thức sau này chỉ cần truyền callback là dùng được ngay, không cần sửa lại `ProjectDetailPage`/`ProjectRiskPage`.
- Toàn bộ logic nghiệp vụ (phân quyền, tính điểm/mức độ, ràng buộc dự án đóng, validate form) đã được xác minh đầy đủ qua bộ test tự động (render + tương tác thật qua Testing Library), thay thế cho việc click tay.

Sẵn sàng merge
- Nhánh `VHDV-61-manage-project-risks` đã hoàn tất phần frontend theo tiêu chí chấp thuận NCL-05-CN-009 (TC-01 → TC-04) và sẵn sàng để merge vào `develop-backup`, với lưu ý duy nhất ở mục "Giới hạn kiểm thử" phía trên.
