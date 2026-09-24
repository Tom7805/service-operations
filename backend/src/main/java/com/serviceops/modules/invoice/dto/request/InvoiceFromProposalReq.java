package com.serviceops.modules.invoice.dto.request;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Yeu cau lap hoa don chinh thuc tu mot de nghi xuat hoa don dang PENDING (NCL-10-CN-001, buoc tiep theo
 * sau khi tao de nghi). Ca ba truong deu tuy chon: so tien luon la tong tien cua de nghi, ngay hoa don
 * mac dinh la hom nay, han thanh toan mac dinh la ngay hoa don + 30 ngay (NCL-10-CN-004), ghi chu mac
 * dinh lay tu ghi chu cua de nghi neu khong truyen.
 */
public record InvoiceFromProposalReq(
		LocalDate invoiceDate,
		@Size(max = 1000, message = "Ghi chu hoa don khong duoc qua 1000 ky tu") String note,
		LocalDate dueDate
) {
}
