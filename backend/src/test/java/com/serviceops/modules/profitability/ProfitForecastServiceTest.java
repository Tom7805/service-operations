package com.serviceops.modules.profitability;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.profitability.dto.response.ProfitForecastRes;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import com.serviceops.modules.profitability.service.impl.ProfitForecastServiceImpl;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfitForecastServiceTest {

	@Mock private ProjectRepository projectRepository;
	@Mock private ContractRepository contractRepository;
	@Mock private TaskRepository taskRepository;
	@Mock private LaborCostService laborCostService;
	@Mock private RevenueRecognitionService revenueRecognitionService;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	private ProfitForecastServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ProfitForecastServiceImpl(projectRepository, contractRepository, taskRepository,
				laborCostService, revenueRecognitionService, sensitiveAccessLogger);
	}

	/**
	 * NCL-09-CN-007-TC-01: du an dung 600/1000 gio ngan sach (chua vuot) -> phan con lai la
	 * phan ngan sach chua dung (400 gio), gia von du bao tinh theo don gia gio binh quan thuc te.
	 */
	@Test
	void forecast_usesRemainingBudget_whenNotOverBudget() {
		Project project = project(42L, 500L);
		Contract contract = contract(500L, ContractType.TIME_AND_MATERIAL, null);
		when(projectRepository.findById(42L)).thenReturn(Optional.of(project));
		when(contractRepository.findById(500L)).thenReturn(Optional.of(contract));

		Task task = task(10L, new BigDecimal("1000.00"), TaskStatus.IN_PROGRESS);
		when(taskRepository.findByProjectIdOrderByIdAsc(42L)).thenReturn(List.of(task));

		when(laborCostService.calculateProjectLaborCost(42L)).thenReturn(
				new ProjectLaborCostRes(42L, new BigDecimal("600.00"), new BigDecimal("60000000.00"), 0, List.of()));
		when(revenueRecognitionService.calculateRecognizedRevenue(42L)).thenReturn(
				new RecognizedRevenueRes(42L, 500L, ContractType.TIME_AND_MATERIAL, RecognitionMethod.HOURLY,
						new BigDecimal("90000000.00"), new BigDecimal("600.00"), 0, 0, null, null, null, List.of()));

		ProfitForecastRes result = service.forecast(42L);

		assertThat(result.budgetHours()).isEqualByComparingTo("1000.00");
		assertThat(result.actualHours()).isEqualByComparingTo("600.00");
		assertThat(result.remainingHours()).isEqualByComparingTo("400.00");
		assertThat(result.overBudget()).isFalse();
		assertThat(result.estimatedTotalHoursAtCompletion()).isEqualByComparingTo("1000.00");

		// Gia von binh quan = 60tr/600h = 100k/h -> gia von du bao = 60tr + 400h*100k = 100.000.000
		assertThat(result.forecastCost()).isEqualByComparingTo("100000000.00");
		// Doanh thu binh quan = 90tr/600h = 150k/h -> doanh thu du bao = 90tr + 400h*150k = 150.000.000
		assertThat(result.forecastRevenue()).isEqualByComparingTo("150000000.00");
		assertThat(result.forecastMargin()).isEqualByComparingTo("50000000.00");
		assertThat(result.riskOfLoss()).isFalse();
		assertThat(result.warnings()).isEmpty();
	}

	/**
	 * NCL-09-CN-007-TC-02: gio cong thuc te (600h) da vuot ngan sach (500h) -> uoc tinh phan con lai
	 * theo toc do tieu hao thuc te (ty le hoan thanh cong viec 1/2 = 50%), canh bao nguy co lo khi
	 * bien du bao am.
	 */
	@Test
	void forecast_extrapolatesByBurnRate_andWarnsRiskOfLoss_whenOverBudget() {
		Project project = project(42L, 500L);
		Contract contract = contract(500L, ContractType.TIME_AND_MATERIAL, null);
		when(projectRepository.findById(42L)).thenReturn(Optional.of(project));
		when(contractRepository.findById(500L)).thenReturn(Optional.of(contract));

		Task doneTask = task(10L, new BigDecimal("250.00"), TaskStatus.DONE);
		Task inProgressTask = task(11L, new BigDecimal("250.00"), TaskStatus.IN_PROGRESS);
		when(taskRepository.findByProjectIdOrderByIdAsc(42L)).thenReturn(List.of(doneTask, inProgressTask));

		when(laborCostService.calculateProjectLaborCost(42L)).thenReturn(
				new ProjectLaborCostRes(42L, new BigDecimal("600.00"), new BigDecimal("90000000.00"), 0, List.of()));
		when(revenueRecognitionService.calculateRecognizedRevenue(42L)).thenReturn(
				new RecognizedRevenueRes(42L, 500L, ContractType.TIME_AND_MATERIAL, RecognitionMethod.HOURLY,
						new BigDecimal("84000000.00"), new BigDecimal("600.00"), 0, 0, null, null, null, List.of()));

		ProfitForecastRes result = service.forecast(42L);

		assertThat(result.overBudget()).isTrue();
		assertThat(result.taskCompletionRate()).isEqualByComparingTo("0.5000");
		// Ngoai suy: 600h / 50% = 1200h uoc tinh khi hoan thanh -> con lai 600h.
		assertThat(result.estimatedTotalHoursAtCompletion()).isEqualByComparingTo("1200.00");
		assertThat(result.remainingHours()).isEqualByComparingTo("600.00");

		assertThat(result.riskOfLoss()).isTrue();
		assertThat(result.warnings()).anyMatch(w -> w.toLowerCase().contains("vuot ngan sach"));
		assertThat(result.warnings()).anyMatch(w -> w.toLowerCase().contains("nguy co du an lo"));
	}

	/** Hop dong tron goi: doanh thu du bao la tron gia tri hop dong, khong phu thuoc so gio. */
	@Test
	void forecast_usesFullContractValue_forPercentageOfCompletionContract() {
		Project project = project(42L, 500L);
		Contract contract = contract(500L, ContractType.FIXED_PRICE, new BigDecimal("200000000.00"));
		when(projectRepository.findById(42L)).thenReturn(Optional.of(project));
		when(contractRepository.findById(500L)).thenReturn(Optional.of(contract));
		when(taskRepository.findByProjectIdOrderByIdAsc(42L)).thenReturn(List.of());

		when(laborCostService.calculateProjectLaborCost(42L)).thenReturn(
				new ProjectLaborCostRes(42L, new BigDecimal("100.00"), new BigDecimal("10000000.00"), 0, List.of()));
		when(revenueRecognitionService.calculateRecognizedRevenue(42L)).thenReturn(
				new RecognizedRevenueRes(42L, 500L, ContractType.FIXED_PRICE, RecognitionMethod.PERCENTAGE_OF_COMPLETION,
						new BigDecimal("100000000.00"), null, 0, 0, new BigDecimal("0.5000"), 2, 1, List.of()));

		ProfitForecastRes result = service.forecast(42L);

		assertThat(result.forecastRevenue()).isEqualByComparingTo("200000000.00");
		assertThat(result.warnings()).anyMatch(w -> w.toLowerCase().contains("chua khai bao ngan sach"));
	}

	@Test
	void forecast_throwsResourceNotFound_whenProjectMissing() {
		when(projectRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.forecast(99L))
				.isInstanceOf(BusinessRuleException.class)
				.satisfies(ex -> assertThat(((BusinessRuleException) ex).getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
	}

	private static Project project(Long id, Long contractId) {
		Project project = new Project();
		project.setId(id);
		project.setContractId(contractId);
		return project;
	}

	private static Contract contract(Long id, ContractType type, BigDecimal totalValue) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setContractType(type);
		contract.setTotalValue(totalValue);
		return contract;
	}

	private static Task task(Long id, BigDecimal budgetHours, TaskStatus status) {
		Task task = new Task();
		task.setId(id);
		task.setBudgetHours(budgetHours);
		task.setStatus(status);
		return task;
	}
}
