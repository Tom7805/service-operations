Handover notes — VHDV-42 (NCL-04-CN-003)

What I changed
- Implemented frontend UI and API client for contract payment milestones.

How to run locally
1. Start backend and make sure it runs on the URL configured in `VITE_API_BASE_URL`.
2. In frontend folder run:
```bash
npm install
npm run dev
```
3. Open a browser to the app and navigate to `/contracts/{id}`.

Key implementation details
- Client checks that total of milestones equals contract value before submit.
- API calls use `fetch` and follow existing `requestBackend` patterns.
- Files to review: see PR file list.

Follow-ups
- Hide add/edit/delete buttons for non-accounting roles.
- Add unit/e2e tests for milestone flows.
- UX polish: use shared modals/buttons for consistent look.
