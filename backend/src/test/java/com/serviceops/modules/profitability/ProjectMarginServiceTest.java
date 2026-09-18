package com.serviceops.modules.profitability;

import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.dto.response.ProjectMarginRes;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import com.serviceops.modules.profitability.service.impl.ProjectMarginServiceImpl;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.expense.repository.SubcontractorExpenseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectMarginServiceTest {

	@Mock private LaborCostService laborCostService;
	@Mock private RevenueRecognitionService revenueRecognitionService;
	@Mock private ProjectExpenseRepository projectExpenseRepository;
	@Mock private SubcontractorExpenseRepository subcontractorExpenseRepository;

	@Test
	void calculatesGrossProfitAndMarginFromCurrentRevenueAndLaborCost() {
		when(laborCostService.calculateProjectLaborCost(42L)).thenReturn(
				new ProjectLaborCostRes(42L, new BigDecimal("10.00"), new BigDecimal("3000000.00"), 0, List.of()));
		when(revenueRecognitionService.calculateRecognizedRevenue(42L)).thenReturn(
				new RecognizedRevenueRes(42L, 5L, null, null, new BigDecimal("5000000.00"), null, 0, 0,
						null, null, null, List.of()));

		when(projectExpenseRepository.findByProjectIdAndStatusOrderByExpenseDateAscIdAsc(org.mockito.ArgumentMatchers.eq(42L), org.mockito.ArgumentMatchers.any()))
				.thenReturn(List.of());
		when(subcontractorExpenseRepository.findByProjectIdAndStatusOrderByIncurredPeriodAscIdAsc(org.mockito.ArgumentMatchers.eq(42L), org.mockito.ArgumentMatchers.any()))
				.thenReturn(List.of());
		ProjectMarginRes result = new ProjectMarginServiceImpl(laborCostService, revenueRecognitionService,
				projectExpenseRepository, subcontractorExpenseRepository)
				.calculateProjectMargin(42L);

		assertThat(result.recognizedRevenue()).isEqualByComparingTo("5000000.00");
		assertThat(result.laborCost()).isEqualByComparingTo("3000000.00");
		assertThat(result.grossProfit()).isEqualByComparingTo("2000000.00");
		assertThat(result.marginRate()).isEqualByComparingTo("0.4000");
	}

	@Test
	void leavesMarginRateNullWhenRecognizedRevenueIsZero() {
		when(laborCostService.calculateProjectLaborCost(42L)).thenReturn(
				new ProjectLaborCostRes(42L, BigDecimal.ZERO, BigDecimal.ZERO, 0, List.of()));
		when(revenueRecognitionService.calculateRecognizedRevenue(42L)).thenReturn(
				new RecognizedRevenueRes(42L, 5L, null, null, BigDecimal.ZERO, null, 0, 0,
						null, null, null, List.of()));

		when(projectExpenseRepository.findByProjectIdAndStatusOrderByExpenseDateAscIdAsc(org.mockito.ArgumentMatchers.eq(42L), org.mockito.ArgumentMatchers.any()))
				.thenReturn(List.of());
		when(subcontractorExpenseRepository.findByProjectIdAndStatusOrderByIncurredPeriodAscIdAsc(org.mockito.ArgumentMatchers.eq(42L), org.mockito.ArgumentMatchers.any()))
				.thenReturn(List.of());
		ProjectMarginRes result = new ProjectMarginServiceImpl(laborCostService, revenueRecognitionService,
				projectExpenseRepository, subcontractorExpenseRepository)
				.calculateProjectMargin(42L);

		assertThat(result.grossProfit()).isZero();
		assertThat(result.marginRate()).isNull();
	}
}