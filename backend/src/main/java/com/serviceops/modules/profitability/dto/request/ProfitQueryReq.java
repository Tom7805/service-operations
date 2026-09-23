package com.serviceops.modules.profitability.dto.request;

import java.time.LocalDate;

/**
 * Tham so ky bao cao cho cac man hinh phan tich loi nhuan (NCL-09-CN-005).
 *
 * <p>{@code from}/{@code to} la khoang ngay lam viec ({@code work_date}) dung de loc cac dong
 * gio cong DA DUYET dua vao bao cao — khong phai ky cham cong hay ky tai chinh.</p>
 */
public record ProfitQueryReq(
		LocalDate from,
		LocalDate to
) {
}
