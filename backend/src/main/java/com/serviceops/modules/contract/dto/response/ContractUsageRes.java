package com.serviceops.modules.contract.dto.response;

import java.math.BigDecimal;

/**
 * Muc do da su dung han muc tran cua hop dong (NCL-04-CN-005, QTN-19).
 *
 * <p>{@code usedValue} la tong gia tri cac moc thanh toan da xuat hoa don
 * ({@code ContractMilestoneStatus.INVOICED}) - dai dien cho phan da "dung" cua
 * han muc, vi he thong hien chua co module hoa don rieng. Khi khong khai bao
 * han muc ({@code limitValue == null}), moi truong percentage/warning deu tra
 * ve trung tinh (khong canh bao).</p>
 *
 * @param usedPercentage  ty le da dung so voi han muc (0-100+), null neu khong dat han muc.
 * @param nearLimit       da dat hoac vuot nguong canh bao 80% han muc (TC-01) nhung chua vuot.
 * @param overLimit       da vuot han muc (TC-02).
 */
public record ContractUsageRes(
		Long contractId,
		BigDecimal totalValue,
		BigDecimal limitValue,
		BigDecimal usedValue,
		BigDecimal remainingValue,
		Integer usedPercentage,
		boolean nearLimit,
		boolean overLimit
) {}
