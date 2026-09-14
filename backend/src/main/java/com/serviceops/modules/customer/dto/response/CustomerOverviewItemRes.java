package com.serviceops.modules.customer.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CustomerOverviewItemRes(
	Long id,
	String code,
	String name,
	String status,
	BigDecimal amount,
	LocalDate date,
	/** Chi co gia tri voi hop dong (Contract.contractType); null voi co hoi/du an khac. */
	String contractType,
	/** Chi co gia tri voi hop dong (Contract.endDate); null voi co hoi/du an khac. */
	LocalDate endDate,
	/** Chi co gia tri voi hop dong (Contract.limitValue); null voi co hoi/du an khac hoac hop dong chua dat han muc. */
	BigDecimal limitValue
) {}