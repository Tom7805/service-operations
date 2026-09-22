package com.serviceops.modules.invoice.dto.request;

import java.time.LocalDate;

/**
 * NCL-10-CN-006: yeu cau chay ra soat nhac thu no. {@code asOf} de trong = lay ngay he thong hom
 * nay; truyen vao chi phuc vu kiem thu/mo phong "toi ngay nhac".
 */
public record DunningRunReq(LocalDate asOf) {
}
