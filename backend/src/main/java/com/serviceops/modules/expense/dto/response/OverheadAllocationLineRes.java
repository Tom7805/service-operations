package com.serviceops.modules.expense.dto.response;

import java.math.BigDecimal;

/** NCL-08-CN-005: phan chi phi chung ma mot du an nhan duoc trong mot lan phan bo. */
public record OverheadAllocationLineRes(Long projectId, BigDecimal approvedHours, BigDecimal allocatedAmount) {
}
