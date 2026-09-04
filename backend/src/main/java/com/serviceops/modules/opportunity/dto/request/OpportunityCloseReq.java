package com.serviceops.modules.opportunity.dto.request;

import com.serviceops.modules.opportunity.enums.LossReason;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request ghi nhan ket qua thang/thua khi dong mot co hoi (NCL-03-CN-005).
 *
 * @param result Ket qua dong co hoi — chi chap nhan {@code WON} hoac {@code LOST}
 *               (kiem tra o tang service, vi bean validation khong gioi han duoc
 *               tap con cua enum).
 * @param lossReason Ly do thua — bat buoc khi {@code result = LOST} (TC-02), bo qua
 *                    khi {@code result = WON}.
 * @param reasonDetail Ghi chu chi tiet them cho ly do (vd: "gia cao hon doi thu 15%"),
 *                      khong bat buoc.
 * @param competitorName Ten doi thu canh tranh neu co, khong bat buoc.
 */
public record OpportunityCloseReq(
		@NotNull(message = "Phai chon ket qua (WON hoac LOST)")
		OpportunityStage result,
		LossReason lossReason,
		@Size(max = 500, message = "Ly do khong duoc vuot qua 500 ky tu")
		String reasonDetail,
		@Size(max = 255, message = "Ten doi thu khong duoc vuot qua 255 ky tu")
		String competitorName
) {}
