package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.invoice.dto.request.RecurringInvoiceRunReq;
import com.serviceops.modules.invoice.dto.request.RecurringScheduleReq;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceRunRes;
import com.serviceops.modules.invoice.dto.response.RecurringScheduleRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.RecurringInvoiceSchedule;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.RecurringInvoiceScheduleRepository;
import com.serviceops.modules.invoice.service.impl.RecurringInvoiceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-10-CN-005: kiem thu hoa don dinh ky cho hop dong duy tri (QTN-19).
 *
 * <p>Ngay he thong co dinh la mung 5 thang 9 nam 2026 (khop {@code billingDayOfMonth}=5 dung
 * trong hau het cac kich ban) tru khi mot test tu dat lai qua {@code RecurringInvoiceRunReq}.</p>
 */
@ExtendWith(MockitoExtension.class)
class RecurringInvoiceServiceTest {

	@Mock
	private RecurringInvoiceScheduleRepository scheduleRepository;
	@Mock
	private InvoiceRepository invoiceRepository;
	@Mock
	private ContractRepository contractRepository;
	@Mock
	private AuditLogService auditLogService;

	private RecurringInvoiceServiceImpl service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-05T06:00:00Z"), ZoneId.of("UTC"));
		service = new RecurringInvoiceServiceImpl(scheduleRepository, invoiceRepository, contractRepository,
				auditLogService, clock);
	}

	private Contract maintenanceContract(Long id, String code, LocalDate endDate) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setContractCode(code);
		contract.setContractType(ContractType.MAINTENANCE);
		contract.setStatus(ContractStatus.ACTIVE);
		contract.setCustomerId(100L);
		contract.setTotalValue(new BigDecimal("500000000"));
		contract.setEndDate(endDate);
		return contract;
	}

	private RecurringInvoiceSchedule schedule(Long contractId, int day, BigDecimal amount, String lastPeriod) {
		RecurringInvoiceSchedule schedule = new RecurringInvoiceSchedule();
		schedule.setId(1L);
		schedule.setContractId(contractId);
		schedule.setBillingDayOfMonth(day);
		schedule.setAmount(amount);
		schedule.setCurrency("VND");
		schedule.setActive(true);
		schedule.setLastGeneratedPeriod(lastPeriod);
		return schedule;
	}

	// TC-01: den ngay lap hoa don trong thang -> tao hoa don nhap dung gia tri ky.
	@Test
	void createsDraftInvoiceOnBillingDay() {
		Contract contract = maintenanceContract(1L, "HD-0001", LocalDate.of(2027, 1, 1));
		RecurringInvoiceSchedule sched = schedule(1L, 5, new BigDecimal("10000000"), "2026-08");

		when(scheduleRepository.findByActiveTrue()).thenReturn(List.of(sched));
		when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
		when(invoiceRepository.sumAmountByContractId(1L)).thenReturn(BigDecimal.ZERO);
		when(invoiceRepository.countByInvoiceNumberStartingWith("HD-202609-")).thenReturn(0L);
		when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
			Invoice invoice = invocation.getArgument(0);
			invoice.setId(500L);
			return invoice;
		});

		RecurringInvoiceRunRes result = service.run(new RecurringInvoiceRunReq(null));

		assertEquals(1, result.created().size());
		assertTrue(result.skipped().isEmpty());
		assertEquals("HD-202609-0001", result.created().get(0).invoiceNumber());
		assertEquals("DRAFT", result.created().get(0).status());
		assertEquals(new BigDecimal("10000000"), result.created().get(0).amount());
		assertEquals("2026-09", sched.getLastGeneratedPeriod());
		verify(scheduleRepository).save(sched);
		verify(auditLogService).record(eq("Lập hóa đơn định kỳ"), eq(AuditTargetType.INVOICE), eq(500L), any(), any());
	}

	// TC-02: hop dong da het hieu luc truoc ngay lap -> khong tao hoa don, bao ly do.
	@Test
	void skipsExpiredContractAndReportsReason() {
		Contract contract = maintenanceContract(2L, "HD-0002", LocalDate.of(2026, 8, 31));
		RecurringInvoiceSchedule sched = schedule(2L, 5, new BigDecimal("5000000"), null);

		when(scheduleRepository.findByActiveTrue()).thenReturn(List.of(sched));
		when(contractRepository.findById(2L)).thenReturn(Optional.of(contract));

		RecurringInvoiceRunRes result = service.run(new RecurringInvoiceRunReq(null));

		assertTrue(result.created().isEmpty());
		assertEquals(1, result.skipped().size());
		assertEquals(2L, result.skipped().get(0).contractId());
		assertTrue(result.skipped().get(0).reason().contains("hết hiệu lực"));
		verify(invoiceRepository, never()).save(any(Invoice.class));
		verify(scheduleRepository, never()).save(any(RecurringInvoiceSchedule.class));
	}

	@Test
	void skipsTerminatedContractEvenWithoutEndDate() {
		Contract contract = maintenanceContract(3L, "HD-0003", null);
		contract.setStatus(ContractStatus.TERMINATED);
		RecurringInvoiceSchedule sched = schedule(3L, 5, new BigDecimal("5000000"), null);

		when(scheduleRepository.findByActiveTrue()).thenReturn(List.of(sched));
		when(contractRepository.findById(3L)).thenReturn(Optional.of(contract));

		RecurringInvoiceRunRes result = service.run(new RecurringInvoiceRunReq(null));

		assertTrue(result.created().isEmpty());
		assertEquals(1, result.skipped().size());
	}

	@Test
	void doesNotProcessScheduleNotDueToday() {
		RecurringInvoiceSchedule sched = schedule(4L, 20, new BigDecimal("5000000"), null);
		when(scheduleRepository.findByActiveTrue()).thenReturn(List.of(sched));

		RecurringInvoiceRunRes result = service.run(new RecurringInvoiceRunReq(null));

		assertTrue(result.created().isEmpty());
		assertTrue(result.skipped().isEmpty());
		verify(contractRepository, never()).findById(anyLong());
	}

	@Test
	void doesNotGenerateTwiceForSamePeriod() {
		RecurringInvoiceSchedule sched = schedule(5L, 5, new BigDecimal("5000000"), "2026-09");
		when(scheduleRepository.findByActiveTrue()).thenReturn(List.of(sched));

		RecurringInvoiceRunRes result = service.run(new RecurringInvoiceRunReq(null));

		assertTrue(result.created().isEmpty());
		assertTrue(result.skipped().isEmpty());
		verify(contractRepository, never()).findById(anyLong());
	}

	// QTN-19: vuot gia tri hop dong -> bo qua kem ly do thay vi tao hoa don.
	@Test
	void skipsWhenExceedingContractValue() {
		Contract contract = maintenanceContract(6L, "HD-0006", null);
		contract.setTotalValue(new BigDecimal("12000000"));
		RecurringInvoiceSchedule sched = schedule(6L, 5, new BigDecimal("5000000"), "2026-08");

		when(scheduleRepository.findByActiveTrue()).thenReturn(List.of(sched));
		when(contractRepository.findById(6L)).thenReturn(Optional.of(contract));
		when(invoiceRepository.sumAmountByContractId(6L)).thenReturn(new BigDecimal("10000000"));

		RecurringInvoiceRunRes result = service.run(new RecurringInvoiceRunReq(null));

		assertTrue(result.created().isEmpty());
		assertEquals(1, result.skipped().size());
		assertTrue(result.skipped().get(0).reason().contains("Vượt giá trị hợp đồng"));
		verify(invoiceRepository, never()).save(any(Invoice.class));
	}

	@Test
	void createsScheduleOnlyForMaintenanceContracts() {
		Contract contract = maintenanceContract(7L, "HD-0007", null);
		contract.setContractType(ContractType.TIME_AND_MATERIAL);
		when(contractRepository.findById(7L)).thenReturn(Optional.of(contract));

		RecurringScheduleReq request = new RecurringScheduleReq(5, new BigDecimal("1000000"), "VND", null, null);
		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.createSchedule(7L, request));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(scheduleRepository, never()).save(any(RecurringInvoiceSchedule.class));
	}

	@Test
	void rejectsDuplicateScheduleForSameContract() {
		Contract contract = maintenanceContract(8L, "HD-0008", null);
		when(contractRepository.findById(8L)).thenReturn(Optional.of(contract));
		when(scheduleRepository.findByContractId(8L)).thenReturn(Optional.of(schedule(8L, 5, BigDecimal.TEN, null)));

		RecurringScheduleReq request = new RecurringScheduleReq(5, new BigDecimal("1000000"), "VND", null, null);
		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.createSchedule(8L, request));

		assertEquals(ErrorCode.DUPLICATE_DATA, exception.getErrorCode());
	}

	@Test
	void createSchedulePersistsAndRecordsAudit() {
		Contract contract = maintenanceContract(9L, "HD-0009", null);
		when(contractRepository.findById(9L)).thenReturn(Optional.of(contract));
		when(scheduleRepository.findByContractId(9L)).thenReturn(Optional.empty());
		when(scheduleRepository.save(any(RecurringInvoiceSchedule.class))).thenAnswer(invocation -> {
			RecurringInvoiceSchedule s = invocation.getArgument(0);
			s.setId(42L);
			return s;
		});

		RecurringScheduleReq request = new RecurringScheduleReq(10, new BigDecimal("2000000"), "VND", "Ghi chu", null);
		RecurringScheduleRes res = service.createSchedule(9L, request);

		assertEquals(42L, res.id());
		assertEquals(10, res.billingDayOfMonth());
		assertEquals(new BigDecimal("2000000"), res.amount());
		assertTrue(res.active());
		verify(auditLogService).record(eq("Khai báo hóa đơn định kỳ"), eq(AuditTargetType.INVOICE), eq(42L),
				any(), any());
	}

	@Test
	void rejectsScheduleForUnknownContract() {
		when(contractRepository.findById(99L)).thenReturn(Optional.empty());
		RecurringScheduleReq request = new RecurringScheduleReq(5, BigDecimal.TEN, "VND", null, null);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.createSchedule(99L, request));

		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
	}
}
