-- NCL-02-CN-002 (TC-04, TC-05): cho phep actor_id la NULL trong customer_audit_logs.
-- Ly do: khi mot request chua xac thuc (khong co JWT) bi tu choi truy cap chuc nang
-- khach hang, khong co CustomUserDetails de lay actor_id -- nhung van phai ghi lai
-- duoc su kien tu choi (DENIED_ACCESS), khong duoc lam mat ban ghi audit vi vi pham
-- rang buoc NOT NULL.
ALTER TABLE customer_audit_logs
    MODIFY COLUMN actor_id BIGINT NULL;
