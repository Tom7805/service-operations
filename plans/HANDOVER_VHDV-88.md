Handover notes — VHDV-88 (NCL-06-CN-001)

Story: NCL-06-CN-001 — Ghi giờ công theo công việc
Nhánh: VHDV-88-log-timesheet-by-task
Tác vụ: Bổ sung Frontend hoàn chỉnh cho phần backend đã có sẵn trên nhánh (entity, service,
controller, test, docs), đảm bảo đầy đủ tiêu chí chấp thuận (TC-01 → TC-04), khớp với Backend.

Bối cảnh nhánh — phát hiện quan trọng trước khi code
- Nhánh `VHDV-88` khi mở lên đã có sẵn frontend nền tảng của module `projects`
  (`ProjectDetailPage`, `WorkBreakdownTree`, `projectsApi.ts`...) từ các PR trước đó (#111/#112 đã
  merge), khác với VHDV-60/61 vốn phải tự merge `develop-backup` để có phần này.
- Tuy nhiên so với `origin/develop-backup` hiện tại, nhánh `VHDV-88` local **thiếu 30 commit** —
  bao gồm nhiều story sau của Epic `NCL-06` (duyệt, điều chỉnh, khoá kỳ, thông báo — ngoài phạm
  vi) **và một bổ sung nhỏ nhưng quan trọng cho chính NCL-06-CN-001**: commit `4eab51f "feat:
  block logging time to closed projects"` (tên gây hiểu nhầm) thực chất thêm endpoint
  `GET /me/time-entry-tasks` — nguồn dữ liệu cho danh sách chọn dự án/công việc khi ghi giờ, được
  tài liệu hoá ngay trong mục NCL-06-CN-001 của `api-contract.md`.
- Không có endpoint này, Frontend không có cách nào để nhân viên tự khám phá "mình đang được giao
  công việc nào" — chỉ có thể ghi giờ công bằng cách mở đúng dự án → cây công việc (WBS) trước,
  không có điểm vào tự thân. Đã hỏi người dùng và được xác nhận: **cherry-pick đúng 1 commit đó**
  (`git cherry-pick -n 4eab51f`, áp dụng sạch, không conflict) thay vì fast-forward toàn bộ
  `develop-backup` (sẽ kéo theo nhiều story ngoài phạm vi) hoặc bỏ qua (chấp nhận UX kém hơn).
  Đã build + `TimeEntryServiceTest` (18/18) pass sau cherry-pick.
- Kết quả: nhánh có thêm 2 commit mới trên `d89d7f0` — `8b0f744` (backend, cherry-pick) và
  `80c7bef` (frontend, toàn bộ phần việc bên dưới).

What changed (frontend NCL-06-CN-001)
- Đọc kỹ backend: `TimeEntryController` (POST/PUT/DELETE theo `projectId/taskId/entryId`,
  `GET /me/time-entries?weekFrom&weekTo`, và `GET /me/time-entry-tasks` sau cherry-pick),
  `TimeEntryServiceImpl` (rule: chỉ người được giao công việc VT-03; dự án phải RUNNING; trùng
  (task, ngày) → 409 DUPLICATE_DATA; trần 12h/ngày backend tự kiểm — Frontend không lặp lại), DTO
  `TimeEntryCreateReq`/`UpdateReq`/`Res`/`TimesheetSummaryRes`/`TimeEntryTaskRes`, và mục
  `NCL-06-CN-001` trong `docs/04-api/api-contract.md` (gồm cả phần "Lưu ý cho Frontend").
- Kiểu dữ liệu (`timesheetTypes.ts`, trước đây rỗng): `TimeEntryStatus`, `TimeEntryRes`,
  `TimeEntryCreateReq`, `TimeEntryUpdateReq`, `TimesheetSummaryRes`, `TimeEntryTaskRes`.
- API client (`timesheetsApi.ts`, trước đây rỗng): `getMyRunningTasks`, `createTimeEntry`,
  `updateTimeEntry`, `deleteTimeEntry`, `getMyWeekTimeEntries` — cùng `TimesheetsApiError`,
  `requestBackend` khớp mẫu `projectsApi.ts` (đọc token từ `localStorage`/`sessionStorage`, map
  `errorCode`/`message`/`fieldErrors`).
- Validator (`timesheetValidators.ts`, trước đây rỗng): `validateTimeEntryCreateForm` (ngày làm
  việc bắt buộc & không tương lai, giờ > 0, ghi chú bắt buộc ≤ 1000 ký tự) và
  `validateTimeEntryUpdateForm` (giờ > 0; ghi chú vẫn yêu cầu điền dù backend không bắt buộc — PUT
  luôn ghi đè, để trống sẽ xoá trắng ghi chú cũ, xem chi tiết trong comment code).
- Tiện ích mới (`utils/weekRange.ts`): tính tuần thứ Hai → Chủ nhật dùng chung cho hai trang, tránh
  lặp logic ngày tháng giữa `TimeEntryPage` và `MyTimesheetPage`.
- Component (`TimeEntryForm.tsx`, trước đây rỗng): modal tạo/sửa. Điểm khác biệt so với
  `RiskFormModal`: **chủ động phát hiện trùng ngày trên FE** bằng cách so `workDate` với các bản
  ghi đã tải sẵn của công việc (prop `existingEntries`), hiện cảnh báo kèm nút "Sửa bản ghi ngày
  …" chuyển form sang chế độ sửa — đúng gợi ý "Lưu ý cho Frontend" của story cho lỗi
  `409 DUPLICATE_DATA`, không cần đợi round-trip API cho trường hợp phổ biến (ngày nằm trong
  khoảng đang xem).
- Trang (`pages/TimeEntryPage.tsx`, trước đây rỗng): màn theo công việc cụ thể — điều hướng tuần
  (Tuần trước/Tuần này/Tuần sau), thẻ tổng giờ + cảnh báo ngân sách (QTN-20), bảng bản ghi
  (ngày/giờ/ghi chú/tính phí/trạng thái), Sửa/Xoá chỉ hiện khi `status === DRAFT`, ẩn nút ghi mới
  khi dự án đã đóng (đúng "Lưu ý cho Frontend": ẩn/vô hiệu hoá form thay vì gọi API rồi mới báo
  lỗi).
- Component (`components/WeeklyTimesheetGrid.tsx`, trước đây rỗng): lưới tuần thuần hiển thị
  (không gọi API) — nhóm theo công việc, cột theo 7 ngày, tổng giờ, thanh tiến trình ngân sách +
  badge cảnh báo khi `overBudgetWarning`.
- Trang (`pages/MyTimesheetPage.tsx`, trước đây rỗng): điểm vào tự thân — tải song song
  `GET /me/time-entry-tasks` (danh sách công việc được giao, mỗi dòng có nút "Ghi giờ công") và
  `GET /me/time-entries` (lưới tuần tổng quan). Khi chọn một công việc (từ danh sách hoặc từ nút
  "Xem/sửa" trên dòng lưới tuần — chỉ hiện khi còn resolve được `projectId` qua danh sách công
  việc được giao), trang tự chuyển sang render `TimeEntryPage` với đúng `projectId/taskId` đã biết
  — không cần điều hướng toàn cục truyền `projectId` từ ngoài vào.
- Tích hợp tối thiểu vào `WorkBreakdownTree.tsx`/`ProjectDetailPage.tsx`: thêm
  `canLogTime`/`onLogTime` (nút "Ghi giờ công" trên mỗi dòng công việc, chỉ hiện khi VT-03 + dự án
  RUNNING) — theo đúng mẫu `onOpenRisks` đã dùng cho NCL-05-CN-009, điểm vào thứ hai (từ trong dự
  án) bên cạnh `MyTimesheetPage`.
- Sửa một lỗi tiềm ẩn phát hiện khi viết code: `todayIso()` ban đầu dùng
  `new Date().toISOString().slice(0,10)` (UTC) trong khi `weekRange.ts` tính tuần theo giờ cục bộ
  — lệch ngày vào một số giờ trong ngày ở múi dương (vd UTC+7). Đã đổi cả hai nơi dùng "hôm nay"
  (`TimeEntryForm.tsx`, `timesheetValidators.ts`) sang tính theo giờ cục bộ, khớp `weekRange.ts`.

Kiểm thử tự động (38 test mới/cập nhật trong module `timesheets`)
- `timesheetValidators.test.ts` (+9): hợp lệ/không hợp lệ cho cả tạo mới và sửa.
- `weekRange.test.ts` (mới, 6): thứ Hai của tuần cho ngày giữa tuần/đầu tuần/cuối tuần, cộng/trừ
  ngày qua tháng, danh sách 7 ngày, nhãn thứ.
- `WeeklyTimesheetGrid.test.tsx` (4): rỗng, nhóm theo công việc đúng ngày/tổng giờ, cảnh báo vượt
  ngân sách, "Chưa đặt ngân sách" khi không có `budgetHours`.
- `TimeEntryPage.test.tsx` (mới, 11): TC-03 Access Denied VT-03; tải đúng tuần hiện tại; trạng
  thái rỗng; ẩn nút khi dự án đóng; TC-01 tạo mới đúng payload; phát hiện trùng ngày → chuyển sang
  sửa; sửa bản ghi DRAFT (ngày không sửa được); xoá có/không xác nhận; không cho sửa/xoá bản ghi
  SUBMITTED; chuyển tuần gọi lại API đúng khoảng ngày; lỗi tải dữ liệu.
- `MyTimesheetPage.test.tsx` (mới, 8): TC-03 Access Denied; tải danh sách công việc + lưới tuần;
  trạng thái rỗng; chuyển tuần; mở đúng `TimeEntryPage` từ danh sách công việc được giao; mở đúng
  từ nút "Xem/sửa" trên lưới tuần; ẩn nút đó khi không resolve được `projectId`; lỗi tải dữ liệu.
- Ghi chú kỹ thuật: dùng ngày thật (không `vi.useFakeTimers()`) — thử ban đầu dùng fake timer để
  cố định "hôm nay" nhưng xung đột với polling nội bộ của `waitFor` (mọi test timeout 5000ms); đổi
  sang tính `weekFrom`/`weekTo`/`today` động bằng chính `weekRange.ts` ngay trong test, ổn định và
  không phụ thuộc thời điểm chạy CI.
- Kết quả kiểm thử:
  - Frontend: 62 test files passed, 465/465 tests passed (100%) — chạy toàn bộ `vitest run`.
  - TypeScript: `tsc --noEmit -p tsconfig.json` pass 0 lỗi.
  - ESLint: `npx eslint "src/modules/timesheets/**/*.{ts,tsx}"` pass 0 lỗi/0 cảnh báo.
  - Backend (sau cherry-pick): `mvnw compile` sạch; `TimeEntryServiceTest` 18/18 pass.

Giới hạn kiểm thử — cần lưu ý khi bàn giao
- Giống VHDV-60/61: **chưa click-through được trên trình duyệt thật** vì module `timesheets`
  chưa có lối vào từ điều hướng chính (`App.tsx`) — `App.tsx` hiện cũng chưa có tab nào cho
  `projects` (kể cả `ProjectDetailPage`/`ProjectRiskPage` của các story trước cũng ở tình trạng
  này). Toàn bộ logic (phân quyền, validate, luồng trùng ngày, ẩn/hiện theo trạng thái dự án/bản
  ghi) đã xác minh qua test tự động (render + tương tác thật qua Testing Library) thay cho click
  tay.
- Chưa viết Playwright e2e (`e2e/tests/project-timesheet-flow.spec.ts` vẫn là file rỗng) — kiểm
  tra codebase cho thấy đây không phải quy ước bắt buộc cho các story dạng này (chỉ
  `pipeline-report.spec.ts` có nội dung thật trong toàn bộ `e2e/tests`), nên không tự ý viết thêm
  ngoài phạm vi được giao.
- `MyTimesheetPage`/lưới tuần: với công việc ĐÃ có giờ công ghi trước đó nhưng nay không còn nằm
  trong `GET /me/time-entry-tasks` (bị thu hồi phân công, hoặc dự án đã đóng), nút "Xem/sửa" trên
  dòng đó sẽ không hiện (không resolve được `projectId`) — đây là giới hạn hợp lý theo đúng thiết
  kế của endpoint mới ("Việc lọc chỉ có tác dụng hỗ trợ giao diện"), không phải lỗi.

Sẵn sàng merge
- Nhánh `VHDV-88-log-timesheet-by-task` đã hoàn tất phần frontend theo tiêu chí chấp thuận
  NCL-06-CN-001 (TC-01 → TC-04), cộng một bổ sung backend nhỏ cherry-pick từ `develop-backup`
  (endpoint `GET /me/time-entry-tasks`), sẵn sàng để merge vào `develop-backup`. Nhánh **chưa được
  push lên remote** — cần xác nhận trước khi push vì đây là thao tác ảnh hưởng trạng thái chia sẻ.
