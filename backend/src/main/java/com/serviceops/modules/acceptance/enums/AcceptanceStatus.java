package com.serviceops.modules.acceptance.enums;

/**
 * Trang thai phieu nghiem thu hang muc (NCL-12-CN-001/002).
 *
 * <p>PENDING_CONFIRMATION -&gt; ACCEPTED (khach hang xac nhan, noi dung bi khoa) hoac
 * PENDING_CONFIRMATION -&gt; NEEDS_REVISION (khach hang tu choi kem ly do) -&gt; nop lai
 * PENDING_CONFIRMATION. ACCEPTED la trang thai cuoi.</p>
 */
public enum AcceptanceStatus {
	PENDING_CONFIRMATION,
	ACCEPTED,
	NEEDS_REVISION
}
