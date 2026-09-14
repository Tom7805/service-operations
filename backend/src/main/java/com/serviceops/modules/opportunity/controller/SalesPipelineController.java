package com.serviceops.modules.opportunity.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.opportunity.dto.response.PipelineReportRes;
import com.serviceops.modules.opportunity.service.SalesPipelineReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-03-CN-007: Bao cao duong ong ban hang theo giai doan.
 *
 * <p>Chi <b>Ban giam doc</b> ({@code VT-01}) va <b>Nhan vien kinh doanh</b>
 * ({@code VT-04}) duoc xem (TC-03) — cung pham vi phan quyen voi bao cao du bao
 * doanh thu {@code NCL-03-CN-004}. Vai tro khac nhan {@code 403 FORBIDDEN}; vi
 * controller nam trong {@code com.serviceops.modules.opportunity.controller}, lan
 * tu choi duoc {@code OpportunityAccessDeniedAspect} tu dong ghi nhat ky
 * {@code DENIED_ACCESS} (khong can code them).</p>
 */
@RestController
@RequestMapping("/opportunities")
@RequiredArgsConstructor
public class SalesPipelineController {

	private final SalesPipelineReportService salesPipelineReportService;

	/**
	 * Bao cao duong ong ban hang: so luong, tong gia tri va so ngay trung binh o
	 * tung giai doan, kem canh bao co hoi dong lau bat thuong (NCL-03-CN-007,
	 * TC-01/02). Moi lan goi deu duoc ghi mot dong nhat ky co hoi (TC-04).
	 */
	@GetMapping("/pipeline-report")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-04')")
	public BaseRes<PipelineReportRes> pipelineReport() {
		return BaseRes.ok(salesPipelineReportService.generate());
	}
}
