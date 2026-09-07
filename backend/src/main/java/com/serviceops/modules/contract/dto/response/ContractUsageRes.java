package com.serviceops.modules.contract.dto.response;

import java.math.BigDecimal;

/**
 * Tinh trang han muc va gia tri da dung cua hop dong tra ve cho FE (NCL-04-CN-005).
 *
 * @param limitValue    Han muc tran da khai bao; NULL neu hop dong khong dat han muc.
 * @param usageRatio    Ty le da dung so voi han muc (0-100, co the vuot 100); NULL neu khong dat han muc.
 * @param remainingValue Gia tri con lai truoc khi cham han muc; NULL neu khong dat han muc.
 * @param nearingLimit  True neu ty le da dung dat tu tam muoi phan tram han muc tro len (TC-01).
 * @param overLimit     True neu gia tri da dung vuot han muc tran (TC-02, QTN-19).
 */
public record ContractUsageRes(
		Long contractId,
		BigDecimal totalValue,
		BigDecimal limitValue,
		BigDecimal usedValue,
		BigDecimal remainingValue,
		BigDecimal usageRatio,
		boolean nearingLimit,
		boolean overLimit
) {}
