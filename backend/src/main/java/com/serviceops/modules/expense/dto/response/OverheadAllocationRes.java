package com.serviceops.modules.expense.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** NCL-08-CN-005: ket qua mot lan phan bo chi phi chung, kem tung dong theo du an. */
public record OverheadAllocationRes(Long id, LocalDate periodStart, LocalDate periodEnd, BigDecimal totalAmount,
		List<OverheadAllocationLineRes> allocations, LocalDateTime createdAt) {
}
