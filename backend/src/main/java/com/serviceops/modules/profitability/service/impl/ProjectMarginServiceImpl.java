package com.serviceops.modules.profitability.service.impl;

import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.dto.response.ProjectMarginRes;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.ProjectMarginService;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.expense.repository.SubcontractorExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
// Khong duoc readOnly: day la bien gioi hoi giao dich khi goi tu controller, va no goi
// LaborCostService/RevenueRecognitionService - ca hai deu GHI audit log (sensitiveAccessLogger)
// trong cung transaction (REQUIRED se nhap vao transaction readOnly cua chinh no neu de o day).
@Transactional
public class ProjectMarginServiceImpl implements ProjectMarginService {

	private final LaborCostService laborCostService;
	private final RevenueRecognitionService revenueRecognitionService;
	private final ProjectExpenseRepository projectExpenseRepository;
	private final SubcontractorExpenseRepository subcontractorExpenseRepository;

	@Override
	public ProjectMarginRes calculateProjectMargin(Long projectId) {
		ProjectLaborCostRes laborCost = laborCostService.calculateProjectLaborCost(projectId);
		RecognizedRevenueRes revenue = revenueRecognitionService.calculateRecognizedRevenue(projectId);
		BigDecimal recognizedRevenue = revenue.totalRecognizedRevenue();
		BigDecimal laborCostAmount = laborCost.totalLaborCost();
		BigDecimal projectExpenseCost = projectExpenseRepository
				.findByProjectIdAndStatusOrderByExpenseDateAscIdAsc(projectId, ExpenseStatus.APPROVED).stream()
				.map(expense -> expense.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal subcontractorCost = subcontractorExpenseRepository
				.findByProjectIdAndStatusOrderByIncurredPeriodAscIdAsc(projectId, ExpenseStatus.APPROVED).stream()
				.map(expense -> expense.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal totalCost = laborCostAmount.add(projectExpenseCost).add(subcontractorCost)
				.setScale(2, RoundingMode.HALF_UP);
		BigDecimal grossProfit = recognizedRevenue.subtract(totalCost).setScale(2, RoundingMode.HALF_UP);
		BigDecimal marginRate = recognizedRevenue.signum() == 0
				? null
				: grossProfit.divide(recognizedRevenue, 4, RoundingMode.HALF_UP);

		return new ProjectMarginRes(projectId, recognizedRevenue, laborCostAmount, projectExpenseCost, subcontractorCost,
				totalCost, grossProfit, marginRate,
				laborCost.missingCostEntryCount(), revenue.missingRateEntryCount(), laborCost.lines(), revenue.lines());
	}
}