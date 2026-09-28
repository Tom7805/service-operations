package com.serviceops.modules.invoice.dto.response;

import java.time.LocalDate;
import java.util.List;

/** NCL-10-CN-005: ket qua mot lan ra soat lap hoa don dinh ky. */
public record RecurringInvoiceRunRes(
		LocalDate asOf,
		List<RecurringInvoiceRes> created,
		List<RecurringInvoiceSkipRes> skipped) {
}
