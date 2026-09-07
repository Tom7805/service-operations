package com.serviceops.modules.contract;

import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractAuditLogRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractExpiryReminderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test ContractExpiryReminderServiceImpl - NCL-04-CN-006 (Nhac hop dong
 * sap het hieu luc): TC-01 hop dong con hai muoi lam ngay thi gui nhac, QTN-27
 * hop dong da duoc nhac trong ngay thi khong gui trung, TC-02 liet ke hop dong
 * da het hieu luc nhung van ACTIVE, TC-04 ghi nhat ky EXPIRY_REMINDER.
 */
@ExtendWith(MockitoExtension.class)
class ContractExpiryReminderServiceImplTest {

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private ContractAuditLogRepository contractAuditLogRepository;

	@Mock
	private ContractAuditLogger contractAuditLogger;

	private ContractExpiryReminderServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ContractExpiryReminderServiceImpl(contractRepository, contractAuditLogRepository, contractAuditLogger);
	}

	private Contract contract(long id, String code, LocalDate endDate, String createdBy) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setContractCode(code);
		contract.setName("Hop dong ERP");
		contract.setCustomerId(1L);
		contract.setContractType(ContractType.TIME_AND_MATERIAL);
		contract.setTotalValue(new BigDecimal("1000000000"));
		contract.setEndDate(endDate);
		contract.setStatus(ContractStatus.ACTIVE);
		contract.setCreatedBy(createdBy);
		return contract;
	}

	@Test
	@DisplayName("TC-01: hop dong con 25 ngay la het hieu luc thi duoc gui nhac")
	void sendsReminderForContractExpiringInTwentyFiveDays() {
		Contract contract = contract(5L, "HD-TEST", LocalDate.now().plusDays(25), "sale01");
		when(contractRepository.findByStatusAndEndDateBetween(eq(ContractStatus.ACTIVE), any(), any()))
				.thenReturn(List.of(contract));
		when(contractAuditLogRepository.existsByContractIdAndActionTypeAndCreatedAtBetween(
				eq(5L), eq(ContractAuditAction.EXPIRY_REMINDER), any(), any())).thenReturn(false);

		List<ContractExpiryAlertRes> sent = service.runReminderScan();

		assertThat(sent).hasSize(1);
		ContractExpiryAlertRes alert = sent.get(0);
		assertThat(alert.contractId()).isEqualTo(5L);
		assertThat(alert.daysRemaining()).isEqualTo(25);
		assertThat(alert.alertType()).isEqualTo("EXPIRING_SOON");
		assertThat(alert.createdBy()).isEqualTo("sale01");

		verify(contractAuditLogger).record(eq(5L), eq(ContractAuditAction.EXPIRY_REMINDER), any());
	}

	@Test
	@DisplayName("QTN-27: hop dong da duoc nhac trong ngay thi khong gui trung va khong ghi nhat ky lai")
	void skipsContractAlreadyRemindedToday() {
		Contract contract = contract(5L, "HD-TEST", LocalDate.now().plusDays(10), "sale01");
		when(contractRepository.findByStatusAndEndDateBetween(eq(ContractStatus.ACTIVE), any(), any()))
				.thenReturn(List.of(contract));
		when(contractAuditLogRepository.existsByContractIdAndActionTypeAndCreatedAtBetween(
				eq(5L), eq(ContractAuditAction.EXPIRY_REMINDER), any(), any())).thenReturn(true);

		List<ContractExpiryAlertRes> sent = service.runReminderScan();

		assertThat(sent).isEmpty();
		verify(contractAuditLogger, never()).record(anyLong(), any(), any());
	}

	@Test
	@DisplayName("Khong co hop dong nao trong cua so thi tra ve danh sach rong")
	void returnsEmptyWhenNoCandidates() {
		when(contractRepository.findByStatusAndEndDateBetween(eq(ContractStatus.ACTIVE), any(), any()))
				.thenReturn(List.of());

		List<ContractExpiryAlertRes> sent = service.runReminderScan();

		assertThat(sent).isEmpty();
		verify(contractAuditLogger, never()).record(anyLong(), any(), any());
	}

	@Test
	@DisplayName("TC-02: liet ke hop dong da het hieu luc nhung van dang ACTIVE, so ngay con lai la so am")
	void listsOverdueActiveContracts() {
		Contract overdue = contract(9L, "HD-OVERDUE", LocalDate.now().minusDays(15), "sale02");
		when(contractRepository.findByStatusAndEndDateBefore(eq(ContractStatus.ACTIVE), any(LocalDate.class)))
				.thenReturn(List.of(overdue));

		List<ContractExpiryAlertRes> result = service.listOverdueActiveContracts();

		assertThat(result).hasSize(1);
		ContractExpiryAlertRes alert = result.get(0);
		assertThat(alert.contractId()).isEqualTo(9L);
		assertThat(alert.daysRemaining()).isEqualTo(-15);
		assertThat(alert.alertType()).isEqualTo("OVERDUE_ACTIVE");
	}

	@Test
	@DisplayName("TC-04: gui nhac thanh cong thi ghi nhat ky kem ma hop dong, so ngay con lai va nguoi phu trach")
	void recordsExpiryReminderAuditLog() {
		Contract contract = contract(5L, "HD-TEST", LocalDate.now().plusDays(25), "sale01");
		when(contractRepository.findByStatusAndEndDateBetween(eq(ContractStatus.ACTIVE), any(), any()))
				.thenReturn(List.of(contract));
		when(contractAuditLogRepository.existsByContractIdAndActionTypeAndCreatedAtBetween(
				eq(5L), eq(ContractAuditAction.EXPIRY_REMINDER), any(LocalDateTime.class), any(LocalDateTime.class)))
				.thenReturn(false);

		service.runReminderScan();

		ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
		verify(contractAuditLogger).record(eq(5L), eq(ContractAuditAction.EXPIRY_REMINDER), detailCaptor.capture());
		assertThat(detailCaptor.getValue()).contains("HD-TEST").contains("25 ngay").contains("sale01");
	}
}
