-- Hieu nang: bo sung chi muc cho cac cot loc/sap xep cua nhung truy van chay thuong xuyen nhat
-- (danh sach + bao cao) ma cac migration truoc chua co. Chi THEM chi muc — khong doi du lieu/cau truc.
-- Cu phap CREATE INDEX chuan, chay duoc tren ca MySQL 8 va H2 (MODE=MySQL).

-- Danh sach khach hang / co hoi / hop dong: findAllByOrderByCreatedAtDesc (tranh filesort toan bang).
CREATE INDEX idx_perf_customers_created_at ON customers (created_at);
CREATE INDEX idx_perf_opportunities_created_at ON opportunities (created_at);
CREATE INDEX idx_perf_contracts_created_at ON contracts (created_at);

-- Nhac hop dong sap het han: findByStatusAndEndDateBetween / findByStatusAndEndDateBefore.
CREATE INDEX idx_perf_contracts_status_end_date ON contracts (status, end_date);

-- Thong bao (goi lien tuc tu thanh dieu huong): loc theo nguoi nhan + da doc, sap xep sent_at DESC;
-- findByRecipientIdAndSentAtAfter.
CREATE INDEX idx_perf_notifications_recipient_read_sent ON notifications (recipient_id, is_read, sent_at);
CREATE INDEX idx_perf_notifications_recipient_sent ON notifications (recipient_id, sent_at);

-- Gio cong theo cong viec + trang thai + ky (bao cao bien loi nhuan/hieu suat du an, de xuat hoa don):
-- findByTaskIdInAndStatus..., sumHoursByTaskIdAndStatusIn, findByTaskIdInAndWorkDateBetween...
CREATE INDEX idx_perf_timesheet_entries_task_status_date ON timesheet_entries (task_id, entry_status, work_date);

-- Bang cong tuan cho duyet theo ky: status = ? AND week_start_date <= ? ORDER BY week_start_date.
CREATE INDEX idx_perf_timesheets_status_week ON timesheets (status, week_start_date);

-- Lich nghi le: truy van theo khoang ngay / existsByHolidayDate.
CREATE INDEX idx_perf_holidays_holiday_date ON holidays (holiday_date);

-- Nhat ky he thong theo doi tuong: findFirstByTargetTypeAndTargetIdOrderByPerformedAtAsc.
CREATE INDEX idx_perf_audit_logs_target ON audit_logs (target_type, target_id, performed_at);
