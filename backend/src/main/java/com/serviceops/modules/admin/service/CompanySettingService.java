package com.serviceops.modules.admin.service;

import com.serviceops.modules.admin.dto.request.CompanySettingReq;
import com.serviceops.modules.admin.dto.response.CompanySettingRes;

/** NCL-15-CN-002: thong tin cong ty va moc ky tai chinh dung chung cho toan he thong. */
public interface CompanySettingService {

	/** Cau hinh hien tai; chua cau hinh thi tra gia tri mac dinh kem {@code configured=false}. */
	CompanySettingRes get();

	/** TC-01 / TC-02: luu cau hinh (tao moi hoac ghi de dong duy nhat), ghi Nhat ky he thong (TC-04). */
	CompanySettingRes update(CompanySettingReq request);

	/** Thang bat dau nam tai chinh (1-12) — dung cho cac bao cao chia ky theo nam/quy. */
	int fiscalYearStartMonth();
}
