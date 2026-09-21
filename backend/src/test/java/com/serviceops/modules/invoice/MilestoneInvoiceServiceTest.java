package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractMilestoneService;
import com.serviceops.modules.invoice.dto.request.InvoiceFromMilestoneReq;
import com.serviceops.modules.invoice.dto.response.InvoiceRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.InvoiceLine;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.service.impl.MilestoneInvoiceServiceImpl;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import com.serviceops.modules.invoice.validator.MilestoneAcceptanceValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Nghiep vu lap hoa don theo moc hop dong (NCL-10-CN-002): TC-01 lap dung gia tri moc va doi
 * trang thai moc, TC-02 chan khi vuot gia tri hop dong (QTN-19), TC-04 ghi Nhat ky he thong.
 * TC-03 (vai tro) nam o {@link InvoiceControllerTest}.
 */
@ExtendWith(MockitoExtension.class)
class MilestoneInvoiceServiceTest {

	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

	@Mock
	private ContractRepository contractRepository;
	@Mock
	private ContractMilestoneRepository milestoneRepository;
	@Mock
	private ContractMilestoneService contractMilestoneService;
	@Mock
	private InvoiceRepository invoiceRepository;
	@Mock
	private InvoiceLineRepository invoiceLineRepository;
	@Mock
	private AuditLogService auditLogService;

	private MilestoneInvoiceServiceImpl service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-21T03:00:00Z"), ZONE);
		service = new MilestoneInvoiceServiceImpl(contractRepository, milestoneRepository,
				contractMilestoneService, invoiceRepository, invoiceLineRepository,
				new MilestoneAcceptanceValidator(), new ContractValueLimitValidator(), auditLogService, clock);
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken("ketoan01", "x"));
	}

	@Test
	void invoicesReadyMilestoneWithExactMilestoneValueAndMarksItInvoiced() {
		stubContract(ContractType.FIXED_PRICE, "1000000000.00", null);
		stubMilestone(ContractMilestoneStatus.READY_TO_INVOICE, "300000000.00");
		when(invoiceRepository.sumActiveTotalByContractId(5L)).thenReturn(BigDecimal.ZERO);
		stubSave();

		InvoiceRes res = service.createFromMilestone(5L, 7L, null);

		assertThat(res.totalAmount()).isEqualByComparingTo("300000000.00");
		assertThat(res.status()).isEqualTo("ISSUED");
		assertThat(res.milestoneId()).isEqualTo(7L);
		assertThat(res.invoicedTotal()).isEqualByComparingTo("300000000.00");
		assertThat(res.contractValue()).isEqualByComparingTo("1000000000.00");
		assertThat(res.invoiceDate()).isEqualTo(LocalDate.of(2026, 9, 21));
		assertThat(res.invoiceCode()).startsWith("INV-20260921-");
		assertThat(res.createdBy()).isEqualTo("ketoan01");

		ArgumentCaptor<InvoiceLine> line = ArgumentCaptor.forClass(InvoiceLine.class);
		verify(invoiceLineRepository).save(line.capture());
		assertThat(line.getValue().getContractMilestoneId()).isEqualTo(7L);
		assertThat(line.getValue().getAmount()).isEqualByComparingTo("300000000.00");
		verify(contractMilestoneService).updateStatus(5L, 7L, ContractMilestoneStatus.INVOICED);
	}

	@Test
	void writesSystemAuditLogWithActorContentAndInvoiceTarget() {
		stubContract(ContractType.MILESTONE, "1000000000.00", null);
		stubMilestone(ContractMilestoneStatus.READY_TO_INVOICE, "300000000.00");
		when(invoiceRepository.sumActiveTotalByContractId(5L)).thenReturn(BigDecimal.ZERO);
		stubSave();

		service.createFromMilestone(5L, 7L, new InvoiceFromMilestoneReq(LocalDate.of(2026, 9, 30), "  Dot 1  "));

		ArgumentCaptor<String> detail = ArgumentCaptor.forClass(String.class);
		verify(auditLogService).record(eq("Lap hoa don theo moc hop dong"), eq(AuditTargetType.INVOICE),
				eq(100L), anyString(), detail.capture());
		assertThat(detail.getValue()).contains("300000000.00").contains("Giai doan 1").contains("HD-TEST");
		ArgumentCaptor<Invoice> invoice = ArgumentCaptor.forClass(Invoice.class);
		verify(invoiceRepository).save(invoice.capture());
		assertThat(invoice.getValue().getInvoiceDate()).isEqualTo(LocalDate.of(2026, 9, 30));
		assertThat(invoice.getValue().getNote()).isEqualTo("Dot 1");
	}

	@Test
	void blocksWhenCumulativeInvoicesWouldExceedContractValueAndAsksForAppendix() {
		stubContract(ContractType.FIXED_PRICE, "1000000000.00", null);
		stubMilestone(ContractMilestoneStatus.READY_TO_INVOICE, "300000000.00");
		when(invoiceRepository.sumActiveTotalByContractId(5L)).thenReturn(new BigDecimal("800000000.00"));

		assertThatThrownBy(() -> service.createFromMilestone(5L, 7L, null))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
					assertThat(ex.getMessage()).contains("phu luc").contains("QTN-19");
				});

		assertNothingWritten();
	}

	@Test
	void allowsInvoiceThatExactlyReachesContractValue() {
		stubContract(ContractType.FIXED_PRICE, "1000000000.00", null);
		stubMilestone(ContractMilestoneStatus.READY_TO_INVOICE, "300000000.00");
		when(invoiceRepository.sumActiveTotalByContractId(5L)).thenReturn(new BigDecimal("700000000.00"));
		stubSave();

		InvoiceRes res = service.createFromMilestone(5L, 7L, null);

		assertThat(res.invoicedTotal()).isEqualByComparingTo("1000000000.00");
	}

	@Test
	void alsoBlocksWhenLimitValueIsBelowCumulativeTotal() {
		stubContract(ContractType.FIXED_PRICE, "1000000000.00", "900000000.00");
		stubMilestone(ContractMilestoneStatus.READY_TO_INVOICE, "300000000.00");
		when(invoiceRepository.sumActiveTotalByContractId(5L)).thenReturn(new BigDecimal("700000000.00"));

		assertThatThrownBy(() -> service.createFromMilestone(5L, 7L, null))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("han muc");

		assertNothingWritten();
	}

	@Test
	void rejectsMilestoneThatIsNotAcceptedYet() {
		stubContract(ContractType.FIXED_PRICE, "1000000000.00", null);
		stubMilestone(ContractMilestoneStatus.PENDING, "300000000.00");

		assertThatThrownBy(() -> service.createFromMilestone(5L, 7L, null))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE);
					assertThat(ex.getMessage()).contains("chua du dieu kien");
				});

		assertNothingWritten();
	}

	@Test
	void rejectsMilestoneThatIsAlreadyInvoiced() {
		stubContract(ContractType.FIXED_PRICE, "1000000000.00", null);
		stubMilestone(ContractMilestoneStatus.INVOICED, "300000000.00");

		assertThatThrownBy(() -> service.createFromMilestone(5L, 7L, null))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("da duoc xuat hoa don");

		assertNothingWritten();
	}

	@Test
	void rejectsContractTypesThatInvoiceThroughOtherFlows() {
		for (ContractType type : List.of(ContractType.TIME_AND_MATERIAL, ContractType.MAINTENANCE)) {
			stubContract(type, "1000000000.00", null);

			assertThatThrownBy(() -> service.createFromMilestone(5L, 7L, null))
					.isInstanceOfSatisfying(BusinessRuleException.class,
							ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
		}
		assertNothingWritten();
	}

	@Test
	void rejectsMilestoneOfAnotherContract() {
		stubContract(ContractType.FIXED_PRICE, "1000000000.00", null);
		ContractMilestone milestone = milestone(ContractMilestoneStatus.READY_TO_INVOICE, "300000000.00");
		milestone.setContractId(9L);
		when(milestoneRepository.findById(7L)).thenReturn(Optional.of(milestone));

		assertThatThrownBy(() -> service.createFromMilestone(5L, 7L, null))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));

		assertNothingWritten();
	}

	@Test
	void returnsNotFoundForUnknownContractOrMilestone() {
		when(contractRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> service.createFromMilestone(99L, 7L, null))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));

		stubContract(ContractType.FIXED_PRICE, "1000000000.00", null);
		when(milestoneRepository.findById(8L)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> service.createFromMilestone(5L, 8L, null))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));

		assertNothingWritten();
	}

	private void assertNothingWritten() {
		verify(invoiceRepository, never()).save(any());
		verify(invoiceLineRepository, never()).save(any());
		verify(contractMilestoneService, never()).updateStatus(any(), any(), any());
		verify(auditLogService, never()).record(any(), any(), any(), any(), any());
	}

	private void stubSave() {
		when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> {
			Invoice saved = inv.getArgument(0);
			saved.setId(100L);
			return saved;
		});
	}

	private void stubContract(ContractType type, String totalValue, String limitValue) {
		Contract contract = new Contract();
		contract.setId(5L);
		contract.setContractCode("HD-TEST");
		contract.setCustomerId(3L);
		contract.setContractType(type);
		contract.setTotalValue(new BigDecimal(totalValue));
		contract.setLimitValue(limitValue == null ? null : new BigDecimal(limitValue));
		when(contractRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(contract));
	}

	private void stubMilestone(ContractMilestoneStatus status, String amount) {
		when(milestoneRepository.findById(7L)).thenReturn(Optional.of(milestone(status, amount)));
	}

	private ContractMilestone milestone(ContractMilestoneStatus status, String amount) {
		ContractMilestone milestone = new ContractMilestone();
		milestone.setId(7L);
		milestone.setContractId(5L);
		milestone.setName("Giai doan 1");
		milestone.setAmount(new BigDecimal(amount));
		milestone.setStatus(status);
		return milestone;
	}
}
