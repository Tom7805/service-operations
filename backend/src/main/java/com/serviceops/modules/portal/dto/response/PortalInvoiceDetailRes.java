package com.serviceops.modules.portal.dto.response;

import com.serviceops.modules.invoice.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** NCL-13-CN-004: chi tiet hoa don tren cong — cac dong hoa don va lich su thanh toan cua chinh khach hang. */
public record PortalInvoiceDetailRes(
		PortalInvoiceRes invoice,
		List<LineRes> lines,
		List<PaymentRes> payments) {

	public record LineRes(String description, BigDecimal amount) {
	}

	public record PaymentRes(LocalDate paymentDate, BigDecimal amount, PaymentMethod method) {
	}
}
