package com.serviceops.modules.contract.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mot phu luc dieu chinh hop dong tra ve cho FE (NCL-04-CN-004).
 *
 * @param oldTotalValue Gia tri hop dong truoc khi phu luc nay co hieu luc; NULL neu phu luc khong dieu chinh gia tri.
 * @param newTotalValue Gia tri hop dong sau dieu chinh; NULL neu phu luc khong dieu chinh gia tri.
 * @param oldEndDate    Ngay ket thuc truoc khi phu luc nay co hieu luc; NULL neu phu luc khong dieu chinh thoi han.
 * @param newEndDate    Ngay ket thuc sau dieu chinh; NULL neu phu luc khong dieu chinh thoi han.
 */
public record AmendmentRes(
		Long id,
		Long contractId,
		String amendmentNo,
		String reason,
		BigDecimal oldTotalValue,
		BigDecimal newTotalValue,
		LocalDate oldEndDate,
		LocalDate newEndDate,
		LocalDate effectiveDate,
		String notes,
		String createdBy,
		LocalDateTime createdAt
) {}
