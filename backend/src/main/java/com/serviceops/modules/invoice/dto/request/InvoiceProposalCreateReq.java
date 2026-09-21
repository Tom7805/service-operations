package com.serviceops.modules.invoice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Yeu cau tao de nghi xuat hoa don tu gio cong da duyet (NCL-10-CN-001). {@code periodFrom}/{@code periodTo} la
 * khoang ngay cong (bao gom ca hai dau) can gom; {@code note} tuy chon.
 */
public record InvoiceProposalCreateReq(
		@NotNull(message = "Ngay bat dau ky khong duoc de trong") LocalDate periodFrom,
		@NotNull(message = "Ngay ket thuc ky khong duoc de trong") LocalDate periodTo,
		@Size(max = 1000, message = "Ghi chu de nghi khong duoc qua 1000 ky tu") String note
) {
}
