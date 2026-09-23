package com.serviceops.modules.profitability.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.profitability.dto.response.PlannedVsActualMarginRes;
import com.serviceops.modules.profitability.dto.response.ProfitForecastRes;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.dto.response.ProjectMarginRes;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.MarginAlertService;
import com.serviceops.modules.profitability.service.MarginComparisonService;
import com.serviceops.modules.profitability.service.ProfitForecastService;
import com.serviceops.modules.profitability.service.ProjectMarginService;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects/{projectId}/profitability")
@RequiredArgsConstructor
public class ProjectProfitabilityController {

	private final LaborCostService laborCostService;
	private final MarginComparisonService marginComparisonService;
	private final ProjectMarginService projectMarginService;
	private final RevenueRecognitionService revenueRecognitionService;
	private final MarginAlertService marginAlertService;
	private final ProfitForecastService profitForecastService;

	@GetMapping("/labor-cost")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-02', 'VT-05')")
	public BaseRes<ProjectLaborCostRes> getLaborCost(@PathVariable Long projectId) {
		return BaseRes.ok(laborCostService.calculateProjectLaborCost(projectId));
	}

	/**
	 * NCL-09-CN-006 — chỉ Quản lý dự án (VT-02) được xem, đúng vai trò của user story; TC-03 yêu cầu
	 * vai trò khác bị từ chối (403, tự ghi nhật ký qua {@code GlobalExceptionHandler} +
	 * {@code AccessDeniedAuditRecorder} — QTN-01/QTN-03).
	 */
	@GetMapping("/planned-vs-actual-margin")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<PlannedVsActualMarginRes> getPlannedVsActualMargin(@PathVariable Long projectId) {
		return BaseRes.ok(marginComparisonService.compare(projectId));
	}

	/** NCL-09-CN-002: TC-04 gioi han chi Ke toan (VT-05) va Ban giam doc (VT-01) duoc xem. */
	@GetMapping("/revenue")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-05')")
	public BaseRes<RecognizedRevenueRes> getRecognizedRevenue(@PathVariable Long projectId) {
		return BaseRes.ok(revenueRecognitionService.calculateRecognizedRevenue(projectId));
	}

	/** NCL-09-CN-003: PM, Ke toan va Ban giam doc xem bien loi nhuan thoi gian thuc. */
	@GetMapping("/margin")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-02', 'VT-05')")
	public BaseRes<ProjectMarginRes> getProjectMargin(@PathVariable Long projectId) {
		ProjectMarginRes margin = projectMarginService.calculateProjectMargin(projectId);
		// NCL-09-CN-004 (TC-01): moi lan tinh lai bien loi nhuan la moi lan danh gia canh bao am bien.
		marginAlertService.evaluateAndAlert(projectId, margin);
		return BaseRes.ok(margin);
	}

	/** NCL-09-CN-007: chi Quan ly du an (VT-02) duoc xem, dung vai tro cua user story. */
	@GetMapping("/profit-forecast")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ProfitForecastRes> getProfitForecast(@PathVariable Long projectId) {
		return BaseRes.ok(profitForecastService.forecast(projectId));
	}
}
