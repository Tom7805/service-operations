package com.serviceops.modules.contract.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Mot moc thanh toan trong danh sach cua {@link MilestoneCreateReq} (NCL-04-CN-003).
 *
 * <p>Nguoi dung nhap {@code percentage} HOAC {@code amount} cho moi moc (theo user
 * story "ty le hoac so tien"); neu chi nhap ty le, so tien duoc quy doi tu gia tri
 * hop dong o tang service. Thieu ca hai bi tu choi voi loi VALIDATION_ERROR.</p>
 *
 * @param name                Ten moc - bat buoc.
 * @param percentage          Ty le phan tram so voi gia tri hop dong (0-100); co the bo trong neu nhap {@code amount}.
 * @param amount              So tien cua moc; co the bo trong neu nhap {@code percentage} de he thong tu quy doi.
 * @param expectedDate        Ngay du kien dat moc; khong bat buoc.
 * @param acceptanceCondition Dieu kien nghiem thu cua moc; khong bat buoc.
 */
public record MilestoneItemReq(
		@NotBlank(message = "Ten moc khong duoc de trong")
		String name,

		@DecimalMin(value = "0", message = "Ty le khong duoc am")
		@DecimalMax(value = "100", message = "Ty le khong duoc vuot qua 100")
		BigDecimal percentage,

		@DecimalMin(value = "0", message = "So tien khong duoc am")
		BigDecimal amount,

		LocalDate expectedDate,

		@Size(max = 500, message = "Dieu kien nghiem thu toi da 500 ky tu")
		String acceptanceCondition
) {}
