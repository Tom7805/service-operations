package com.serviceops.modules.contract.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request lap phu luc dieu chinh hop dong (NCL-04-CN-004).
 *
 * <p>Phai dieu chinh it nhat mot trong hai noi dung {@code newTotalValue} hoac
 * {@code newEndDate} - thieu ca hai bi tu choi voi loi VALIDATION_ERROR (TC-02).
 * Bo trong mot truong nghia la khong dieu chinh noi dung do, khong phai dat
 * lai ve rong/0.</p>
 *
 * @param reason        Ly do lap phu luc - bat buoc.
 * @param effectiveDate Ngay phu luc co hieu luc - bat buoc.
 * @param newTotalValue Gia tri hop dong moi sau dieu chinh; bo trong = khong dieu chinh gia tri.
 * @param newEndDate    Ngay ket thuc moi sau dieu chinh; bo trong = khong dieu chinh thoi han.
 * @param notes         Ghi chu them; khong bat buoc.
 */
public record AmendmentCreateReq(
		@NotBlank(message = "Ly do lap phu luc khong duoc de trong")
		@Size(max = 500, message = "Ly do toi da 500 ky tu")
		String reason,

		@NotNull(message = "Ngay hieu luc cua phu luc khong duoc de trong")
		LocalDate effectiveDate,

		@DecimalMin(value = "0", message = "Gia tri hop dong moi khong duoc am")
		BigDecimal newTotalValue,

		LocalDate newEndDate,

		@Size(max = 1000, message = "Ghi chu toi da 1000 ky tu")
		String notes
) {}
