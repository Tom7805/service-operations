package com.serviceops.modules.admin.dto.request;

import com.serviceops.common.enums.Currency;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * NCL-15-CN-002: thong tin cong ty va moc ky tai chinh.
 *
 * @param fiscalYearStartMonth thang bat dau nam tai chinh (1-12). VD 4: nam tai chinh 2026 = 01/04/2026 - 31/03/2027.
 * @param standardWorkingDaysPerMonth so ngay cong chuan mot thang (1-31).
 */
public record CompanySettingReq(
		@NotBlank(message = "Ten cong ty khong duoc de trong")
		@Size(max = 255, message = "Ten cong ty khong qua 255 ky tu")
		String companyName,
		@Pattern(regexp = "^$|^\\d{10}(-\\d{3})?$",
				message = "Ma so thue khong dung dinh dang (10 chu so, VD: 0101234567; chi nhanh them \"-XXX\")")
		String taxCode,
		@Size(max = 500, message = "Dia chi khong qua 500 ky tu")
		String address,
		@Pattern(regexp = "^$|^0\\d{9,10}$", message = "So dien thoai khong dung dinh dang (10-11 chu so, bat dau bang 0)")
		String phone,
		@Email(message = "Email khong dung dinh dang")
		@Size(max = 255, message = "Email khong qua 255 ky tu")
		String email,
		@NotNull(message = "Phai chon don vi tien te")
		Currency currency,
		@NotNull(message = "Phai chon thang bat dau nam tai chinh")
		@Min(value = 1, message = "Thang bat dau nam tai chinh phai tu 1 den 12")
		@Max(value = 12, message = "Thang bat dau nam tai chinh phai tu 1 den 12")
		Integer fiscalYearStartMonth,
		@NotNull(message = "So ngay cong chuan mot thang khong duoc de trong")
		@Min(value = 1, message = "So ngay cong chuan mot thang phai tu 1 den 31")
		@Max(value = 31, message = "So ngay cong chuan mot thang phai tu 1 den 31")
		Integer standardWorkingDaysPerMonth
) {}
