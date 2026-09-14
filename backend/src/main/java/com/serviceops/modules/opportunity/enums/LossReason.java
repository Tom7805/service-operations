package com.serviceops.modules.opportunity.enums;

/**
 * Ly do thua cua co hoi ban hang (NCL-03-CN-005). Bat buoc phai chon mot gia
 * tri khi dong co hoi voi ket qua {@link OpportunityStage#LOST} (TC-02) —
 * du lieu nay duoc luu lai de cong ty rut kinh nghiem cho cac lan sau.
 */
public enum LossReason {

	/** Gia de xuat cao hon ky vong / ngan sach cua khach hang. */
	PRICE_TOO_HIGH,

	/** Khach hang chon doi thu canh tranh (ten doi thu ghi o competitorName). */
	LOST_TO_COMPETITOR,

	/** Khach hang cat hoac khong con ngan sach cho du an. */
	BUDGET_CUT,

	/** Thoi diem khong phu hop — khach hang hoan hoac huy du an. */
	TIMING_NOT_RIGHT,

	/** Giai phap / nang luc de xuat khong dap ung yeu cau cua khach hang. */
	REQUIREMENT_MISMATCH,

	/** Khach hang ngung phan hoi, khong xac dinh duoc ly do cu the. */
	NO_RESPONSE,

	/** Ly do khac ngoai cac muc tren — xem chi tiet o reasonDetail. */
	OTHER
}
