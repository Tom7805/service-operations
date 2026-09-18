package com.serviceops.modules.profitability.enums;

/**
 * Cach tinh doanh thu ghi nhan cua du an (NCL-09-CN-002), suy ra tu
 * {@code Contract.contractType}.
 */
public enum RecognitionMethod {

	/** Hop dong theo gio (TIME_AND_MATERIAL): tong gio da duyet nhan don gia ap dung tung dong. */
	HOURLY,

	/** Hop dong tron goi (FIXED_PRICE): gia tri hop dong nhan ty le hoan thanh cong viec. */
	PERCENTAGE_OF_COMPLETION
}
