package com.serviceops.modules.contract.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractAppendixCreateReq(
		@NotBlank(message = "Noi dung phu luc khong duoc de trong")
		@Size(max = 1000, message = "Noi dung phu luc khong duoc vuot qua 1000 ky tu") String content,
		@NotNull(message = "Gia tri dieu chinh khong duoc de trong") BigDecimal adjustmentValue,
		@NotNull(message = "Ngay hieu luc khong duoc de trong") LocalDate effectiveDate
) {
}