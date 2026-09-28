package com.serviceops.modules.rate.dto.request;

/**
 * Tham so tra cuu don gia ap dung cho mot dong gio cong (NCL-07-CN-005).
 *
 * <p>{@code level} bat buoc gui kem vi ho so nhan su ({@code Employee}) hien
 * chi luu {@code professionalRole}, chua co cot cap bac — khac voi
 * {@code professionalRole}/{@code asOf} deu tu suy ra duoc tu chinh dong gio
 * cong (qua nhan su thuc hien va ngay cong).</p>
 */
public record RateLookupReq(
		String level
) {
}
