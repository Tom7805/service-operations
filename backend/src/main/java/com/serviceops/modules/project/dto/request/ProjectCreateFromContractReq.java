package com.serviceops.modules.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ProjectCreateFromContractReq(
		@NotBlank(message = "Ten du an khong duoc de trong") String name,
		@NotNull(message = "Ngay bat dau khong duoc de trong") LocalDate startDate,
		@NotNull(message = "Ngay ket thuc du kien khong duoc de trong") LocalDate expectedEndDate,
		@NotNull(message = "Nguoi quan ly du an khong duoc de trong") Long projectManagerId
) {}