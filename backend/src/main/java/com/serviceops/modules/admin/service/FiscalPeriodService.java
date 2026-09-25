package com.serviceops.modules.admin.service;

import com.serviceops.modules.admin.dto.response.FiscalPeriodRes;

import java.time.LocalDate;

/**
 * NCL-15-CN-002-TC-01: chia ky tai chinh theo thang bat dau da cau hinh. Cac bao cao theo nam/quy goi
 * service nay thay vi mac dinh nam duong lich.
 */
public interface FiscalPeriodService {

	/** Nam tai chinh {@code fiscalYear} (so cua nam duong lich chua ngay bat dau). */
	FiscalPeriodRes getFiscalYear(int fiscalYear);

	/** Nam tai chinh chua ngay {@code date} (mac dinh hom nay). */
	FiscalPeriodRes resolve(LocalDate date);
}
