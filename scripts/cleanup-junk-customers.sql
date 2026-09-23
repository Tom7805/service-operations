-- =============================================================================
--  DỌN KHÁCH HÀNG RÁC/TEST VÔ NGHĨA + TOÀN BỘ DỮ LIỆU PHỤ THUỘC
-- =============================================================================
--  Dùng khi: trong lúc test thủ công qua UI, ai đó tạo khách hàng kiểu
--  "test", "asdf", trùng lặp vô nghĩa — và cơ hội/hợp đồng/dự án tạo dựa trên
--  khách hàng đó (dù về mặt kỹ thuật VẪN có customer_id hợp lệ, do
--  opportunities/projects.customer_id là NOT NULL + FOREIGN KEY, không thể
--  trỏ tới khách hàng không tồn tại — xem V35__create_opportunity_tables.sql
--  và V47__create_projects_from_contract.sql).
--
--  AN TOÀN: mọi bảng con dưới đây dùng khoá ngoại RESTRICT theo mặc định của
--  InnoDB (trừ vài bảng có ghi rõ ON DELETE CASCADE). Nếu script xoá thiếu một
--  bảng phụ thuộc nào đó chưa liệt kê ở đây, MySQL sẽ BÁO LỖI và DỪNG ngay,
--  không xoá dở dang, không làm hỏng dữ liệu — cứ chạy trong một transaction,
--  nếu lỗi thì gửi lại thông báo lỗi để bổ sung bảng còn thiếu vào script.
--
--  CÁCH DÙNG:
--   1. Chạy PHẦN 1 (chỉ SELECT) trước để xem đúng khách hàng nào là rác.
--   2. Điền ID các khách hàng rác đó vào bảng tạm ở đầu PHẦN 2.
--   3. Chạy PHẦN 2 trong một transaction, kiểm tra số dòng bị xoá ở mỗi bước
--      hợp lý (không âm, không bất thường) rồi mới gõ COMMIT; nếu sai gõ
--      ROLLBACK.
-- =============================================================================


-- =============================================================================
--  PHẦN 1 — CHỈ XEM, KHÔNG XOÁ GÌ. Chạy trước để xác định ID khách hàng rác.
-- =============================================================================

-- Liệt kê toàn bộ khách hàng NGOÀI 6 khách hàng seed chính thức (id 1001-1006)
-- — ứng viên khả nghi cao nhất là "rác/test" vì không nằm trong bộ seed gốc.
SELECT id, code, name, tax_code, phone, owner_id, created_by, created_at
FROM customers
WHERE id NOT IN (1001, 1002, 1003, 1004, 1005, 1006)
ORDER BY created_at DESC;

-- Với mỗi khách hàng nghi là rác, xem trước nó kéo theo bao nhiêu dữ liệu con
-- (đổi 9999 thành id khách hàng đang kiểm tra):
-- SELECT
--   (SELECT COUNT(*) FROM opportunities WHERE customer_id = 9999) AS so_co_hoi,
--   (SELECT COUNT(*) FROM contracts     WHERE customer_id = 9999) AS so_hop_dong,
--   (SELECT COUNT(*) FROM projects      WHERE customer_id = 9999) AS so_du_an;


-- =============================================================================
--  PHẦN 2 — XOÁ. Sửa danh sách ID ở bảng tạm bên dưới rồi chạy cả khối trong
--  MỘT transaction (BEGIN ... COMMIT/ROLLBACK).
-- =============================================================================

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS junk_customer_ids;
CREATE TEMPORARY TABLE junk_customer_ids (customer_id BIGINT PRIMARY KEY);

-- >>> SỬA DÒNG DƯỚI: điền đúng ID khách hàng rác đã xác nhận ở PHẦN 1 <<<
INSERT INTO junk_customer_ids (customer_id) VALUES (9999) /* , (9998), (9997) */;

-- ----- Tập hợp các ID cơ hội / hợp đồng / dự án / báo giá sẽ bị xoá theo -----
DROP TEMPORARY TABLE IF EXISTS junk_opportunity_ids;
CREATE TEMPORARY TABLE junk_opportunity_ids AS
SELECT id FROM opportunities WHERE customer_id IN (SELECT customer_id FROM junk_customer_ids);

DROP TEMPORARY TABLE IF EXISTS junk_contract_ids;
CREATE TEMPORARY TABLE junk_contract_ids AS
SELECT id FROM contracts WHERE customer_id IN (SELECT customer_id FROM junk_customer_ids);

DROP TEMPORARY TABLE IF EXISTS junk_project_ids;
CREATE TEMPORARY TABLE junk_project_ids AS
SELECT id FROM projects WHERE customer_id IN (SELECT customer_id FROM junk_customer_ids);

DROP TEMPORARY TABLE IF EXISTS junk_quote_ids;
CREATE TEMPORARY TABLE junk_quote_ids AS
SELECT id FROM quotes WHERE opportunity_id IN (SELECT id FROM junk_opportunity_ids);

DROP TEMPORARY TABLE IF EXISTS junk_task_ids;
CREATE TEMPORARY TABLE junk_task_ids AS
SELECT id FROM project_tasks WHERE project_id IN (SELECT id FROM junk_project_ids);

-- ----- 0) Bảng nối mốc dự án <-> công việc (khoá ngoại tới cả hai) -----
DELETE FROM project_milestone_items WHERE task_id IN (SELECT id FROM junk_task_ids);

-- ----- 1) Lá xa nhất trong nhánh chấm công/timesheet -----
DELETE FROM timesheet_entry_adjustments WHERE task_id IN (SELECT id FROM junk_task_ids);
DELETE FROM timesheet_timers WHERE task_id IN (SELECT id FROM junk_task_ids);
DELETE FROM timesheet_entries WHERE task_id IN (SELECT id FROM junk_task_ids);
DELETE FROM project_task_assignments WHERE task_id IN (SELECT id FROM junk_task_ids);
DELETE FROM project_tasks WHERE id IN (SELECT id FROM junk_task_ids);
DELETE FROM work_packages WHERE project_id IN (SELECT id FROM junk_project_ids);

-- ----- 2) Lá thuộc nhánh dự án (mốc, rủi ro, chi phí, phân bổ chi phí chung) -----
DELETE FROM project_milestones      WHERE project_id IN (SELECT id FROM junk_project_ids);
DELETE FROM project_risks           WHERE project_id IN (SELECT id FROM junk_project_ids);
DELETE FROM project_expenses        WHERE project_id IN (SELECT id FROM junk_project_ids);
DELETE FROM subcontractor_expenses  WHERE project_id IN (SELECT id FROM junk_project_ids);
DELETE FROM overhead_allocations    WHERE project_id IN (SELECT id FROM junk_project_ids);

-- ----- 3) Đề xuất hoá đơn / hoá đơn gắn dự án hoặc hợp đồng -----
DELETE FROM invoice_proposal_lines WHERE invoice_proposal_id IN (
    SELECT id FROM invoice_proposals WHERE project_id IN (SELECT id FROM junk_project_ids)
       OR contract_id IN (SELECT id FROM junk_contract_ids)
);
DELETE FROM invoice_proposals WHERE project_id IN (SELECT id FROM junk_project_ids)
    OR contract_id IN (SELECT id FROM junk_contract_ids);

DELETE FROM invoice_lines WHERE invoice_id IN (
    SELECT id FROM invoices WHERE contract_id IN (SELECT id FROM junk_contract_ids)
);
DELETE FROM invoices WHERE contract_id IN (SELECT id FROM junk_contract_ids);
DELETE FROM recurring_invoice_schedules WHERE contract_id IN (SELECT id FROM junk_contract_ids);

-- ----- 4) Xoá dự án (đã hết bảng con phụ thuộc) -----
DELETE FROM projects WHERE id IN (SELECT id FROM junk_project_ids);

-- ----- 5) Nhánh hợp đồng: mốc/phụ lục/gia hạn/đơn giá riêng theo hợp đồng -----
DELETE FROM contract_milestones WHERE contract_id IN (SELECT id FROM junk_contract_ids);
DELETE FROM contract_appendices WHERE contract_id IN (SELECT id FROM junk_contract_ids);
DELETE FROM contract_renewals   WHERE contract_id IN (SELECT id FROM junk_contract_ids);
DELETE FROM contract_bill_rates WHERE contract_id IN (SELECT id FROM junk_contract_ids);
DELETE FROM contracts WHERE id IN (SELECT id FROM junk_contract_ids);

-- ----- 6) Nhánh báo giá của cơ hội -----
DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM junk_quote_ids);
DELETE FROM quotes WHERE id IN (SELECT id FROM junk_quote_ids);

-- ----- 7) Cơ hội (opportunity_activities / opportunity_stage_history tự xoá
--          theo do co ON DELETE CASCADE — xem V37, V40) -----
DELETE FROM opportunities WHERE id IN (SELECT id FROM junk_opportunity_ids);

-- ----- 8) Cuối cùng: khách hàng rác -----
DELETE FROM customers WHERE id IN (SELECT customer_id FROM junk_customer_ids);

-- ----- Kiểm tra lại trước khi COMMIT -----
SELECT * FROM customers WHERE id IN (SELECT customer_id FROM junk_customer_ids);
-- Kỳ vọng: 0 dòng. Nếu đúng 0 dòng và các bước trên không báo lỗi FK nào thì:
--   COMMIT;
-- Nếu có gì bất thường (lỡ xoá nhầm, báo lỗi giữa chừng):
--   ROLLBACK;
