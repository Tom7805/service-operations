package com.serviceops.modules.contract.dto.request;

import com.serviceops.modules.contract.enums.ContractType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request khai bao loai hop dong, gia tri va han muc tran (NCL-04-CN-002).
 *
 * <p>Ke toan (VT-05) chon loai hop dong (tron goi/theo gio/theo moc), co the
 * dieu chinh gia tri va nhap han muc tran neu co (QTN-19).</p>
 *
 * @param contractType Loai hop dong - bat buoc chon (TC-01).
 * @param totalValue   Gia tri hop dong dieu chinh; null = giu nguyen gia tri hien tai.
 * @param limitValue   Han muc tran xuat hoa don; null = khong dat han muc ("neu co").
 */
public record ContractTypeLimitReq(
@NotNull(message = "Phai chon loai hop dong")
ContractType contractType,

@DecimalMin(value = "0", message = "Gia tri hop dong khong duoc am")
BigDecimal totalValue,

@DecimalMin(value = "0", message = "Han muc tran khong duoc am")
BigDecimal limitValue
) {}