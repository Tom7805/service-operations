package com.serviceops.modules.profitability.service;

import com.serviceops.modules.profitability.dto.request.MarginThresholdReq;
import com.serviceops.modules.profitability.dto.response.MarginAlertRes;
import com.serviceops.modules.profitability.dto.response.ProjectMarginRes;

public interface MarginAlertService {

	/** Nguong bien loi nhuan toi thieu hien hanh (cac truong null neu chua tung dat). */
	MarginAlertRes getThreshold();

	/** Dat/doi nguong (chi Ban giam doc - TC-03); ghi nhat ky he thong (TC-04). */
	MarginAlertRes setThreshold(MarginThresholdReq request);

	/**
	 * So sanh bien loi nhuan vua tinh lai ({@code margin}) voi nguong hien hanh, gui canh bao
	 * cho PM phu trach du an va toan bo Ban giam doc neu thap hon nguong (TC-01). Bo qua neu
	 * du an chua co du lieu ({@code margin.marginRate() == null}, TC-02) hoac chua ai dat
	 * nguong. Chong gui trung nhieu lan trong cung mot ngay cho cung du an.
	 */
	void evaluateAndAlert(Long projectId, ProjectMarginRes margin);
}
