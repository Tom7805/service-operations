package com.serviceops.modules.opportunity.enums;

/**
 * Trang thai tong quat cua mot co hoi ban hang (Epic NCL-03).
 *
 * <p>NCL-03-CN-006 (TC-02) chi dung gia tri {@link #OPEN} de quyet dinh con
 * duoc them hoat dong cham soc moi hay khong — co hoi da {@link #WON} hoac
 * {@link #LOST} coi la "da dong", chi con xem lai lich su.</p>
 */
public enum OpportunityStatus {

	/** Con dang theo duoi, chua co ket qua cuoi cung. */
	OPEN,

	/** Da dong: khach hang dong y, chuyen thanh hop dong. */
	WON,

	/** Da dong: khong thanh cong. */
	LOST
}
