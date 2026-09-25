package com.serviceops.modules.admin.dto.response;

import com.serviceops.common.enums.Currency;

import java.time.LocalDateTime;

/**
 * Cau hinh cong ty dang dung chung cho toan he thong.
 *
 * @param configured {@code false} khi quan tri vien chua luu lan nao — cac truong con lai la gia tri mac dinh
 *                   (VND, nam tai chinh bat dau thang 1, 22 ngay cong/thang).
 */
public record CompanySettingRes(
		boolean configured,
		String companyName,
		String taxCode,
		String address,
		String phone,
		String email,
		Currency currency,
		int fiscalYearStartMonth,
		int standardWorkingDaysPerMonth,
		String updatedBy,
		LocalDateTime updatedAt
) {}
