package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.ContractUsageReq;
import com.serviceops.modules.contract.dto.response.ContractUsageRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.enums.UsageSource;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractLimitServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test ContractLimitServiceImpl - NCL-04-CN-005 (Canh bao khi sap vuot
 * han muc hop dong): TC-01 ghi nhan gio cong da duyet dat tam muoi lam phan
 * tram han muc thi canh bao nhung van cho ghi nhan, TC-02 hoa don lam vuot
 * han muc thi tu choi (QTN-19), TC-04 ghi nhat ky LIMIT_USAGE_UPDATE, va cac
 * truong hop ngoai le (khong tim thay hop dong, hop dong khong dat han muc).
 */
@ExtendWith(MockitoExtension.class)
class ContractLimitServiceTest {

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private ContractAuditLogger contractAuditLogger;

	private ContractLimitServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ContractLimitServiceImpl(contractRepository, contractAuditLogger);
		SecurityContextHolder.getContext().setAuthentication(
				new TestingAuthenticationToken("qldA01", "n/a"));
	}

	private Contract contract(long id, String totalValue, String limitValue, String usedValue) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setContractCode("HD-TEST");
		contract.setName("Hop dong ERP");
		contract.setCustomerId(1L);
		contract.setContractType(ContractType.TIME_AND_MATERIAL);
		contract.setTotalValue(new BigDecimal(totalValue));
		contract.setLimitValue(limitValue == null ? null : new BigDecimal(limitValue));
		contract.setUsedValue(usedValue == null ? BigDecimal.ZERO : new BigDecimal(usedValue));
		contract.setStatus(ContractStatus.ACTIVE);
		return contract;
	}

	@Test
	@DisplayName("TC-01: ghi nhan gio cong da duyet dat 85% han muc thi van cho ghi nhan va canh bao")
	void warnsWhenTimesheetApprovalReachesEightyPercent() {
		Contract contract = contract(5L, "1000000000", "1000000000", "800000000");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

		ContractUsageRes res = service.recordUsage(5L,
				new ContractUsageReq(new BigDecimal("50000000"), UsageSource.TIMESHEET_APPROVAL));

		assertThat(res.usedValue()).isEqualByComparingTo("850000000");
		assertThat(res.usageRatio()).isEqualByComparingTo("85.00");
		assertThat(res.nearingLimit()).isTrue();
		assertThat(res.overLimit()).isFalse();
		verify(contractRepository).save(contract);
	}

	@Test
	@DisplayName("Gio cong da duyet lam vuot han muc van duoc ghi nhan, khong bi chan")
	void allowsTimesheetApprovalEvenWhenExceedingLimit() {
		Contract contract = contract(5L, "1000000000", "1000000000", "950000000");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

		ContractUsageRes res = service.recordUsage(5L,
				new ContractUsageReq(new BigDecimal("100000000"), UsageSource.TIMESHEET_APPROVAL));

		assertThat(res.usedValue()).isEqualByComparingTo("1050000000");
		assertThat(res.overLimit()).isTrue();
		verify(contractRepository).save(contract);
	}

	@Test
	@DisplayName("TC-02 (QTN-19): hoa don lam vuot han muc tran thi tu choi ghi nhan")
	void rejectsInvoiceWhenExceedingLimit() {
		Contract contract = contract(5L, "1000000000", "1000000000", "950000000");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));

		assertThatThrownBy(() -> service.recordUsage(5L,
				new ContractUsageReq(new BigDecimal("100000000"), UsageSource.INVOICE)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(contractRepository, never()).save(any());
		verify(contractAuditLogger, never()).record(any(), any(), any());
	}

	@Test
	@DisplayName("Hoa don dung bang han muc tran (khong vuot) van duoc ghi nhan")
	void allowsInvoiceReachingExactlyTheLimit() {
		Contract contract = contract(5L, "1000000000", "1000000000", "900000000");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

		ContractUsageRes res = service.recordUsage(5L,
				new ContractUsageReq(new BigDecimal("100000000"), UsageSource.INVOICE));

		assertThat(res.usedValue()).isEqualByComparingTo("1000000000");
		assertThat(res.overLimit()).isFalse();
	}

	@Test
	@DisplayName("Hop dong khong dat han muc thi luon cho ghi nhan, ty le va gia tri con lai la null")
	void allowsAnySourceWhenNoLimitDeclared() {
		Contract contract = contract(5L, "1000000000", null, "0");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

		ContractUsageRes res = service.recordUsage(5L,
				new ContractUsageReq(new BigDecimal("2000000000"), UsageSource.INVOICE));

		assertThat(res.usedValue()).isEqualByComparingTo("2000000000");
		assertThat(res.usageRatio()).isNull();
		assertThat(res.remainingValue()).isNull();
		assertThat(res.nearingLimit()).isFalse();
		assertThat(res.overLimit()).isFalse();
	}

	@Test
	@DisplayName("TC-04: ghi nhan thanh cong thi luu nhat ky LIMIT_USAGE_UPDATE kem nguon va gia tri da dung")
	void recordsLimitUsageAuditLog() {
		Contract contract = contract(5L, "1000000000", "1000000000", "800000000");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

		service.recordUsage(5L, new ContractUsageReq(new BigDecimal("50000000"), UsageSource.TIMESHEET_APPROVAL));

		ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
		verify(contractAuditLogger).record(eq(5L), eq(ContractAuditAction.LIMIT_USAGE_UPDATE), detailCaptor.capture());
		assertThat(detailCaptor.getValue())
				.contains("TIMESHEET_APPROVAL")
				.contains("850000000")
				.contains("canh bao");
	}

	@Test
	@DisplayName("Khong tim thay hop dong thi bao RESOURCE_NOT_FOUND")
	void rejectsWhenContractMissing() {
		when(contractRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.recordUsage(99L,
				new ContractUsageReq(new BigDecimal("1"), UsageSource.TIMESHEET_APPROVAL)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("Xem tinh trang han muc tra ve dung gia tri da dung va ty le hien tai")
	void getsUsageStatus() {
		Contract contract = contract(5L, "1000000000", "1000000000", "300000000");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));

		ContractUsageRes res = service.getUsage(5L);

		assertThat(res.usedValue()).isEqualByComparingTo("300000000");
		assertThat(res.usageRatio()).isEqualByComparingTo("30.00");
		assertThat(res.nearingLimit()).isFalse();
	}

	@Test
	@DisplayName("Xem tinh trang han muc cua hop dong khong ton tai thi bao RESOURCE_NOT_FOUND")
	void rejectsGetUsageWhenContractMissing() {
		when(contractRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.getUsage(99L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}
}
