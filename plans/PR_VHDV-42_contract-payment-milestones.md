Title: FE: NCL-04-CN-003 — Quản lý mốc thanh toán của hợp đồng

Summary
- Thêm UI quản lý mốc thanh toán (list / create / edit / delete).
- Thêm API client để gọi các endpoint `GET/POST/PUT/DELETE /contracts/{id}/milestones`.

Files changed
- frontend/src/modules/contracts/api/contractsApi.ts
- frontend/src/modules/contracts/types/contractTypes.ts
- frontend/src/modules/contracts/components/MilestoneTable.tsx
- frontend/src/modules/contracts/pages/ContractDetailPage.tsx

Acceptance criteria mapping
- NCL-04-CN-003-TC-01: Tạo danh sách mốc và lưu thành công (kiểm tra tổng = giá trị hợp đồng) — enforced client-side check and will be validated again by backend.
- NCL-04-CN-003-TC-02: Dữ liệu không hợp lệ — client-side validation for required fields and positive amount; backend must still return 400 for invalid payloads.
- NCL-04-CN-03: Phân quyền — backend enforces; frontend shows actions but will rely on backend 403 for enforcement. Recommend hiding action buttons by role in follow-up.

Test / QA steps
1. Open contract detail page: `/contracts/{id}` (replace `{id}` with an existing contract id).
2. Verify contract value displays and existing milestones load.
3. Add milestones whose sum equals contract value — should save.
4. Try saving where sum != contract value — client shows error and prevents save.
5. Edit and delete a milestone and verify backend persistence.

Notes for reviewers
- Backend endpoints expected: `GET /contracts/{id}`, `GET /contracts/{id}/milestones`, `POST /contracts/{id}/milestones`, `PUT /contracts/{id}/milestones/{mid}`, `DELETE /contracts/{id}/milestones/{mid}`.
- DB migration `V44__create_contract_milestones_table.sql` defines schema used.
- Styling uses existing modal/table classes; UX polish and role-based hiding left to follow-up PR.

Merge checklist (for approvers)
- [ ] Backend endpoints tested and returning expected payloads
- [ ] Manual end-to-end: create/edit/delete milestones passed
- [ ] No TypeScript or lint errors (build passed locally)
- [ ] QA acceptance tests (TC-01..TC-04) signed off
