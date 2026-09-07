package com.serviceops.modules.rate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Mot chuc danh dang co don gia ban hieu luc — dung de dung danh sach chuc
 * danh cho o chon o man hinh lap bao gia (NCL-03-CN-003), tranh nguoi dung
 * go tay sai ten khien khong tra duoc don gia.
 */
public record BillRateRes(
		String professionalRole,
		BigDecimal dailyRate,
		LocalDate effectiveFrom
) {}
