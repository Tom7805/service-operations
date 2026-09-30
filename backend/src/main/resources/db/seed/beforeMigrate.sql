-- =============================================================================
--  TU DON LAN CHAY SEED THAT BAI — callback Flyway, chay TRUOC moi lan migrate
-- =============================================================================
--  Flyway nhan dien file theo TEN (beforeMigrate.sql), khong phai migration nen
--  khong ghi vao flyway_schema_history. Nam trong db/seed nen CHI chay o noi
--  nap seed (profile dev, Docker local) — prod chi nap db/migration, test tat
--  Flyway, deu khong cham toi file nay.
--
--  Van de: mot file seed R__ loi mot lan (vd DELETE vuong khoa ngoai) thi Flyway
--  ghi dong success = 0 va TU CHOI moi lan khoi dong sau do ("contains a failed
--  repeatable migration"), ke ca khi da pull ban sua — ai cung phai tu vao DB
--  xoa dong do bang tay. Xoa o day de pull ban sua ve la chay lai duoc ngay.
--
--  An toan vi: moi file R__ cua du an deu la seed trong db/seed, chi co DML
--  (khong CREATE/ALTER/DROP) nen lan loi da duoc rollback tron ven, chay lai
--  khong de lai rac. Chi xoa dong R__ (version IS NULL) — migration V loi van
--  chan khoi dong nhu cu vi DDL tren MySQL khong rollback duoc, can nguoi xu ly.
--
--  Kiem tra bang ton tai truoc khi xoa: DB trong chua co flyway_schema_history.
-- ----------------------------------------------------------------------------
SET @cleanup_failed_seeds_sql = IF(
    (SELECT COUNT(*) FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'flyway_schema_history') > 0,
    'DELETE FROM flyway_schema_history WHERE success = 0 AND version IS NULL',
    'DO 0');
PREPARE cleanup_failed_seeds FROM @cleanup_failed_seeds_sql;
EXECUTE cleanup_failed_seeds;
DEALLOCATE PREPARE cleanup_failed_seeds;
