package com.serviceops.modules.invoice.dto.request;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Yeu cau lap hoa don cho mot moc thanh toan (NCL-10-CN-002). Ca ba truong deu
 * tuy chon: so tien luon la gia tri cua moc, ngay hoa don mac dinh la hom nay,
 * han thanh toan mac dinh la ngay hoa don + 30 ngay (NCL-10-CN-004).
 */
public record InvoiceFromMilestoneReq(
		LocalDate invoiceDate,
		@Size(max = 1000, message = "Ghi chu hoa don khong duoc qua 1000 ky tu") String note,
		LocalDate dueDate
) {
}
