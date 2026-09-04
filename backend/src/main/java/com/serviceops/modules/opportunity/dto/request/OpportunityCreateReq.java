package com.serviceops.modules.opportunity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request tao co hoi ban hang (NCL-03-CN-001).
 * Gan dung: ten co hoi, khach hang (bat buoc - da co ho so), gia tri du kien
 * (phai la so duong, TC-02), ngay du kien ky va nguoi phu trach.
 *
 * @param customerId Id khach hang da co ho so trong he thong (TC-01).
 * @param expectedValue Gia tri du kien - bat buoc la so duong (TC-02).
 */
public record OpportunityCreateReq(
	@NotBlank(message = "Ten co hoi khong duoc de trong")
	@Size(max = 255, message = "Ten co hoi khong qua 255 ky tu")
	String name,
	@NotNull(message = "Phai chon khach hang cho co hoi")
	Long customerId,
	@Positive(message = "Gia tri du kien phai la so duong")
	@NotNull(message = "Gia tri du kien khong duoc de trong")
	BigDecimal expectedValue,
	LocalDate expectedCloseDate,
	Long ownerId
) {}