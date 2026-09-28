package com.serviceops.modules.invoice.dto.request;

import java.time.LocalDate;

/**
 * NCL-10-CN-005: yeu cau chay ra soat lap hoa don dinh ky. {@code asOf} de trong = lay ngay
 * he thong hom nay; truyen vao chi phuc vu kiem thu/mo phong "toi ngay lap".
 */
public record RecurringInvoiceRunReq(LocalDate asOf) {
}
