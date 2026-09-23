package com.serviceops.modules.profitability.enums;

/**
 * Muc do canh bao bien loi nhuan (NCL-09-CN-004). Bien duoi nguong nhung con duong van canh
 * bao (TC-01 dung vi du 15% -> 10%, van duong) - {@code NEGATIVE} chi danh rieng cho truong
 * hop bien da am, de phan biet muc do nghiem trong trong noi dung thong bao.
 */
public enum AlertLevel {

	/** Bien duoi nguong toi thieu nhung van >= 0. */
	BELOW_THRESHOLD,

	/** Bien da am (lo). */
	NEGATIVE
}
