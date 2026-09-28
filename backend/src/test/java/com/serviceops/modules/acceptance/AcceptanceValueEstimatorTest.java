package com.serviceops.modules.acceptance;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.modules.acceptance.dto.response.AcceptanceReadinessRes.TaskValueRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceReadinessRes.ValueSuggestionRes;
import com.serviceops.modules.acceptance.service.impl.AcceptanceValueEstimator;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.dto.response.RevenueLineRes;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Goi y gia tri nghiem thu tu cong viec cua nhanh hang muc (NCL-12-CN-001). */
@ExtendWith(MockitoExtension.class)
class AcceptanceValueEstimatorTest {

	private static final LocalDate DAY = LocalDate.of(2026, 9, 29);

	@Mock private ContractRepository contractRepository;
	@Mock private TimeEntryRepository timeEntryRepository;
	@Mock private RevenueRecognitionService revenueRecognitionService;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	@InjectMocks private AcceptanceValueEstimator estimator;

	@Test
	@DisplayName("T&M: cong doanh thu gio cong da duyet, tinh phi cua dung cong viec trong nhanh, dem dong thieu don gia")
	void hourlySumsBillableRevenueOfBranchTasksOnly() {
		Project project = project(ContractType.TIME_AND_MATERIAL, "0");
		Task survey = task(11L, "Khao sat nghiep vu");
		Task analysis = task(12L, "Phan tich nghiep vu");
		when(revenueRecognitionService.calculateRecognizedRevenue(1L)).thenReturn(revenue(List.of(
				line(101L, "8", "225000", "1800000", true, false),   // Khao sat — tinh phi
				line(102L, "2", null, "0", false, false),            // Khao sat — khong tinh phi: bo qua
				line(103L, "3", null, "0", true, true),              // Phan tich — thieu don gia
				line(104L, "4", "312500", "1250000", true, false))));// Kiem thu — ngoai nhanh
		when(timeEntryRepository.findAllById(List.of(101L, 103L, 104L)))
				.thenReturn(List.of(entry(101L, 11L), entry(103L, 12L), entry(104L, 20L)));

		ValueSuggestionRes res = estimator.estimate(project, List.of(survey, analysis), 3);

		assertThat(res.method()).isEqualTo(RecognitionMethod.HOURLY);
		assertThat(res.suggestedValue()).isEqualByComparingTo("1800000");
		assertThat(res.missingRateEntryCount()).isEqualTo(1);
		assertThat(res.tasks()).extracting(TaskValueRes::taskName, TaskValueRes::value)
				.containsExactly(tuple("Khao sat nghiep vu", new BigDecimal("1800000")),
						tuple("Phan tich nghiep vu", BigDecimal.ZERO));
		assertThat(res.tasks().get(0).billableHours()).isEqualByComparingTo("8");
		assertThat(res.tasks().get(1).billableHours()).isEqualByComparingTo("3");
	}

	@Test
	@DisplayName("Tron goi: gia tri hop dong chia deu theo cong viec du an, nhan so cong viec cua nhanh, ghi nhat ky xem doanh thu")
	void fixedPriceSplitsContractValueByTaskCount() {
		Project project = project(ContractType.FIXED_PRICE, "48500000");

		ValueSuggestionRes res = estimator.estimate(project, List.of(task(11L, "A"), task(12L, "B")), 4);

		assertThat(res.method()).isEqualTo(RecognitionMethod.PERCENTAGE_OF_COMPLETION);
		assertThat(res.suggestedValue()).isEqualByComparingTo("24250000");
		assertThat(res.projectTaskCount()).isEqualTo(4);
		assertThat(res.tasks()).allSatisfy(t -> {
			assertThat(t.value()).isEqualByComparingTo("12125000");
			assertThat(t.billableHours()).isNull();
		});
		verify(sensitiveAccessLogger).logView(eq(SensitiveDataType.REVENUE), eq(1L), anyString(), anyString());
		verifyNoInteractions(revenueRecognitionService);
	}

	@Test
	@DisplayName("Hop dong bao tri/theo moc, du an khong gan hop dong: khong goi y, khong doc doanh thu")
	void noSuggestionForUnsupportedContractOrMissingContract() {
		assertThat(estimator.estimate(project(ContractType.MAINTENANCE, "1000"), List.of(task(1L, "A")), 1)).isNull();

		Project orphan = new Project();
		orphan.setId(2L);
		assertThat(estimator.estimate(orphan, List.of(task(1L, "A")), 1)).isNull();

		verifyNoInteractions(revenueRecognitionService);
		verify(sensitiveAccessLogger, never()).logView(eq(SensitiveDataType.REVENUE), anyLong(), anyString(), anyString());
	}

	private Project project(ContractType type, String contractValue) {
		Contract contract = new Contract();
		contract.setId(9L);
		contract.setContractType(type);
		contract.setTotalValue(new BigDecimal(contractValue));
		when(contractRepository.findById(9L)).thenReturn(Optional.of(contract));
		Project project = new Project();
		project.setId(1L);
		project.setContractId(9L);
		return project;
	}

	private Task task(Long id, String name) {
		Task task = new Task();
		task.setId(id);
		task.setName(name);
		return task;
	}

	private TimeEntry entry(Long id, Long taskId) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setTaskId(taskId);
		return entry;
	}

	private RevenueLineRes line(Long entryId, String hours, String rate, String revenue, boolean billable,
			boolean missingRate) {
		return new RevenueLineRes(entryId, 1L, "Nhan su", DAY, new BigDecimal(hours),
				rate == null ? null : new BigDecimal(rate), new BigDecimal(revenue), billable, missingRate);
	}

	private RecognizedRevenueRes revenue(List<RevenueLineRes> lines) {
		return new RecognizedRevenueRes(1L, 9L, ContractType.TIME_AND_MATERIAL, RecognitionMethod.HOURLY,
				BigDecimal.ZERO, BigDecimal.ZERO, 0, 0, null, null, null, lines);
	}
}
