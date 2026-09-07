package com.serviceops.modules.contract.dto.request;

import com.serviceops.modules.contract.enums.UsageSource;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request ghi nhan gia tri da dung cua hop dong (NCL-04-CN-005).
 *
 * <p>Nguon {@code TIMESHEET_APPROVAL} chi ghi nhan va canh bao khi gan cham
 * han muc (TC-01); nguon {@code INVOICE} bi tu choi neu ghi nhan se lam vuot
 * han muc tran da khai bao (TC-02, QTN-19).</p>
 *
 * @param amount Gia tri phat sinh them can cong don - bat buoc, khong duoc am hoac bang khong.
 * @param source Nguon phat sinh - bat buoc.
 */
public record ContractUsageReq(
		@NotNull(message = "Gia tri phat sinh khong duoc de trong")
		@DecimalMin(value = "0.01", message = "Gia tri phat sinh phai lon hon khong")
		BigDecimal amount,

		@NotNull(message = "Nguon phat sinh khong duoc de trong")
		UsageSource source
) {}
