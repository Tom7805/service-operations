package com.serviceops.modules.opportunity.service;

import com.serviceops.modules.opportunity.dto.response.PipelineReportRes;

/**
 * Bao cao duong ong ban hang theo giai doan (NCL-03-CN-007).
 */
public interface SalesPipelineReportService {

	/**
	 * Sinh bao cao duong ong ban hang: so luong, tong gia tri va so ngay trung binh
	 * o tung giai doan, kem canh bao cac co hoi "dong lau bat thuong" (TC-01/02).
	 * Moi lan goi deu ghi mot dong nhat ky co hoi (TC-04).
	 */
	PipelineReportRes generate();
}
