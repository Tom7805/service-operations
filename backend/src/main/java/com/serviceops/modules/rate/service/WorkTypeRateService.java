package com.serviceops.modules.rate.service;

import com.serviceops.modules.rate.dto.request.WorkTypeRateFactorReq;
import com.serviceops.modules.rate.dto.response.WorkTypeRateFactorRes;
import com.serviceops.modules.timesheet.enums.WorkType;

import java.math.BigDecimal;
import java.util.List;

public interface WorkTypeRateService {

	/** Khai bao he so cho mot loai hinh cong viec, hoac ghi de neu da co (upsert). */
	WorkTypeRateFactorRes upsert(WorkTypeRateFactorReq request);

	/** Danh sach he so cua tat ca loai hinh cong viec, sap theo ten loai. */
	List<WorkTypeRateFactorRes> listAll();

	/**
	 * He so nhan don gia cua mot loai hinh cong viec — dung khi tra don gia cuoi cung cho mot
	 * dong gio cong (NCL-07-CN-005). Nem {@code RESOURCE_NOT_FOUND} neu loai hinh do chua duoc
	 * khai bao he so.
	 */
	BigDecimal resolveFactor(WorkType workType);
}
