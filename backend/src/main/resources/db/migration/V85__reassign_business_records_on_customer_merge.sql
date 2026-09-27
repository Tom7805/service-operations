-- NCL-02-CN-006 (sua loi): gop ho so khach hang phai chuyen TOAN BO co hoi, hop dong, du an, hoa don (va de nghi
-- xuat hoa don) cua ho so bi gop sang ho so giu lai, dong thoi ghi vet nguon goc tung ban ghi (TC-02).
-- Truoc day thao tac gop chi chuyen nhat ky khach hang nen du lieu nghiep vu van nam o ho so da MERGED.
--
-- original_customer_id: khach hang goc truoc lan gop dau tien; NULL = ban ghi chua tung bi chuyen.

ALTER TABLE opportunities     ADD COLUMN original_customer_id BIGINT NULL;
ALTER TABLE contracts         ADD COLUMN original_customer_id BIGINT NULL;
ALTER TABLE projects          ADD COLUMN original_customer_id BIGINT NULL;
ALTER TABLE invoices          ADD COLUMN original_customer_id BIGINT NULL;
ALTER TABLE invoice_proposals ADD COLUMN original_customer_id BIGINT NULL;

-- Chuyen bu cho cac lan gop DA thuc hien truoc ban sua nay. Moi lan chay chuyen mot bac merged_into_id; lap lai
-- 3 lan de di het chuoi A -> B -> C (ho so giu lai sau do lai bi gop tiep). Chay lai khong doi gi vi dieu kien
-- chi khop ban ghi con nam o ho so MERGED.

UPDATE opportunities t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE contracts t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE projects t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE invoices t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE invoice_proposals t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;

UPDATE opportunities t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE contracts t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE projects t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE invoices t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE invoice_proposals t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;

UPDATE opportunities t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE contracts t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE projects t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE invoices t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
UPDATE invoice_proposals t JOIN customers s ON s.id = t.customer_id AND s.status = 'MERGED' AND s.merged_into_id IS NOT NULL
SET t.original_customer_id = COALESCE(t.original_customer_id, s.id), t.customer_id = s.merged_into_id;
