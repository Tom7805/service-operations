package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.RenewalCreateReq;
import com.serviceops.modules.contract.dto.response.RenewalRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractRenewal;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractRenewalRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractRenewalServiceImpl;
import com.serviceops.modules.contract.validator.ContractLimitValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test ContractRenewalServiceImpl - NCL-04-CN-007 (Gia han hop dong):
 * TC-01 luong thanh cong cap nhat ngay ket thuc va gia tri, TC-02 tu choi hop
 * dong da dong, va cac truong hop ngoai le ve ngay/han muc.
 */
@ExtendWith(MockitoExtension.class)
class ContractRenewalServiceTest {

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private ContractRenewalRepository renewalRepository;

	@Mock
	private ContractAuditLogger auditLogger;

	private final ContractLimitValidator contractLimitValidator = new ContractLimitValidator();

	private ContractRenewalServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ContractRenewalServiceImpl(contractRepository, renewalRepository, auditLogger,
				contractLimitValidator);
		lenient().when(renewalRepository.save(any(ContractRenewal.class))).thenAnswer(inv -> {
			ContractRenewal r = inv.getArgument(0);
			r.setId(1L);
			return r;
		});
	}

	private Contract activeContract() {
		Contract c = new Contract();
		c.setId(1L);
		c.setStatus(ContractStatus.ACTIVE);
		c.setTotalValue(new BigDecimal("500000000"));
		c.setEndDate(LocalDate.of(2026, 12, 31));
		return c;
	}

	@Test
	@DisplayName("TC-01: gia han hop dong dang hieu luc, cap nhat ngay ket thuc va cong them gia tri")
	void renewsActiveContractSuccessfully() {
		Contract contract = activeContract();
		when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
		RenewalCreateReq request = new RenewalCreateReq(
				LocalDate.of(2027, 6, 30), new BigDecimal("100000000"), "Khach hang dong y gia han");

		RenewalRes result = service.create(1L, request);

		assertThat(result.previousEndDate()).isEqualTo(LocalDate.of(2026, 12, 31));
		assertThat(result.newEndDate()).isEqualTo(LocalDate.of(2027, 6, 30));
		assertThat(result.valueAfter()).isEqualByComparingTo("600000000");
		assertThat(contract.getEndDate()).isEqualTo(LocalDate.of(2027, 6, 30));
		assertThat(contract.getTotalValue()).isEqualByComparingTo("600000000");
		verify(auditLogger).record(any(), any(), any());
	}

	@Test
	@DisplayName("TC-02: hop dong da dong (COMPLETED) thi tu choi gia han")
	void rejectsRenewalWhenContractClosed() {
		Contract contract = activeContract();
		contract.setStatus(ContractStatus.COMPLETED);
		when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));

		assertThatThrownBy(() -> service.create(1L,
				new RenewalCreateReq(LocalDate.of(2027, 1, 1), null, null)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
	}

	@Test
	@DisplayName("Ngay ket thuc moi khong sau ngay ket thuc hien tai thi bao loi validation")
	void rejectsNewEndDateNotAfterCurrent() {
		when(contractRepository.findById(1L)).thenReturn(Optional.of(activeContract()));

		assertThatThrownBy(() -> service.create(1L,
				new RenewalCreateReq(LocalDate.of(2026, 12, 31), null, null)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("Gia tri bo sung vuot han muc tran thi bao loi validation (QTN-19)")
	void rejectsAdditionalValueExceedingLimit() {
		Contract contract = activeContract();
		contract.setLimitValue(new BigDecimal("500000000"));
		when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));

		assertThatThrownBy(() -> service.create(1L,
				new RenewalCreateReq(LocalDate.of(2027, 1, 1), new BigDecimal("50000000"), null)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}
}
