# Quy uoc lam viec (Contributing)

## 1. Branch

- `main`: code luon chay duoc, chi merge qua Pull Request da review.
- `develop`: nhanh tich hop chung (neu team dung Git Flow rut gon).
- Nhanh tinh nang: `feature/<epic>-<story-code>-<mo-ta-ngan>`, vi du `feature/contract-CT-05-tao-hop-dong`.
- Nhanh sua loi: `bugfix/<mo-ta-ngan>` hoac `hotfix/<mo-ta-ngan>` (hotfix danh cho production).

## 2. Commit message

Theo Conventional Commits:

```
<type>(<scope>): <mo ta ngan>

vi du:
feat(contract): them API tao hop dong moi
fix(timesheet): sua loi tinh tong gio lam sai timezone
docs(readme): cap nhat huong dan setup local
```

Cac `type` thuong dung: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`.

## 3. Pull Request

- Dat ten PR ro rang, gan voi ma User Story/Task trong backlog.
- Dien theo template trong `.github/PULL_REQUEST_TEMPLATE.md`.
- Bat buoc: CI (`ci-backend`, `ci-frontend`) pass truoc khi merge.
- Can it nhat 1 nguoi review approve truoc khi merge vao `main`/`develop`.
- Merge bang **Squash and merge** de lich su commit gon gang.

## 4. Truoc khi mo PR

```bash
# backend
cd backend && ./mvnw test

# frontend
cd frontend && npm run lint && npm run test
```

## 5. Database migration

- Moi thay doi schema phai la 1 file Flyway moi trong `backend/src/main/resources/db/migration`,
  dat ten `V<so-thu-tu>__<mo-ta>.sql` (vi du `V16__add_index_contract_status.sql`).
- Khong bao gio sua lai migration da merge vao `main` — neu sai, tao migration moi de fix.

## 6. Code style

- Backend: theo cau hinh mac dinh cua `.editorconfig` + Lombok cho boilerplate, dat ten package/class theo cau truc module da co san trong `com.serviceops.modules.*`.
- Frontend: ESLint + Prettier bat buoc pass truoc khi commit (`npm run lint`, `npm run format`).

Setup moi truong local: xem [README.md](README.md).
