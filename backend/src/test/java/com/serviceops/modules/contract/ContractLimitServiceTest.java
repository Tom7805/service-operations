package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.response.ContractUsageRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractLimitServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

/**
 * Unit test ContractLimitServiceImpl - NCL-04-CN-005 (Canh bao khi sap vuot
 * han muc hop dong, QTN-19): TC-01 gan nguong 80% duoc canh bao, TC-02 vuot
 * han muc duoc danh dau, va cac truong hop khong dat han muc / khong tim thay.
 */
@ExtendWith(MockitoExtension.class)
class ContractLimitServiceTest {

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private ContractMilestoneRepository milestoneRepository;

	private ContractLimitServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ContractLimitServiceImpl(contractRepository, milestoneRepository);
	}

	private Contract contract(BigDecimal totalValue, BigDecimal limitValue) {
		Contract c = new Contract();
		c.setId(1L);
		c.setTotalValue(totalValue);
		c.setLimitValue(limitValue);
		return c;
	}

	private ContractMilestone milestone(BigDecimal amount, ContractMilestoneStatus status) {
		ContractMilestone m = new ContractMilestone();
		m.setAmount(amount);
		m.setStatus(status);
		return m;
	}

	@Test
	@DisplayName("TC-01: da dung tu tam muoi phan tram han muc tro len thi duoc danh dau gan cham nguong")
	void flagsNearLimitAtThreshold() {
		when(contractRepository.findById(1L)).thenReturn(Optional.of(
				contract(new BigDecimal("500000000"), new BigDecimal("500000000"))));
		when(milestoneRepository.findByContractIdOrderByExpectedDateAscIdAsc(1L)).thenReturn(List.of(
				milestone(new BigDecimal("400000000"), ContractMilestoneStatus.INVOICED),
				milestone(new BigDecimal("50000000"), ContractMilestoneStatus.PENDING)));

		ContractUsageRes usage = service.getUsage(1L);

		assertThat(usage.usedValue()).isEqualByComparingTo("400000000");
		assertThat(usage.usedPercentage()).isEqualTo(80);
		assertThat(usage.nearLimit()).isTrue();
		assertThat(usage.overLimit()).isFalse();
	}

	@Test
	@DisplayName("TC-02: da vuot han muc thi danh dau overLimit va khong con nearLimit")
	void flagsOverLimit() {
		when(contractRepository.findById(1L)).thenReturn(Optional.of(
				contract(new BigDecimal("500000000"), new BigDecimal("400000000"))));
		when(milestoneRepository.findByContractIdOrderByExpectedDateAscIdAsc(1L)).thenReturn(List.of(
				milestone(new BigDecimal("450000000"), ContractMilestoneStatus.INVOICED)));

		ContractUsageRes usage = service.getUsage(1L);

		assertThat(usage.overLimit()).isTrue();
		assertThat(usage.nearLimit()).isFalse();
		assertThat(usage.remainingValue()).isEqualByComparingTo("-50000000");
	}

	@Test
	@DisplayName("Khong dat han muc thi khong canh bao du da xuat hoa don nhieu")
	void noWarningWhenNoLimitDeclared() {
		when(contractRepository.findById(1L)).thenReturn(Optional.of(
				contract(new BigDecimal("500000000"), null)));
		when(milestoneRepository.findByContractIdOrderByExpectedDateAscIdAsc(1L)).thenReturn(List.of(
				milestone(new BigDecimal("500000000"), ContractMilestoneStatus.INVOICED)));

		ContractUsageRes usage = service.getUsage(1L);

		assertThat(usage.limitValue()).isNull();
		assertThat(usage.usedPercentage()).isNull();
		assertThat(usage.nearLimit()).isFalse();
		assertThat(usage.overLimit()).isFalse();
	}

	@Test
	@DisplayName("Chua vuot qua tam muoi phan tram thi khong canh bao")
	void belowThresholdIsNotFlagged() {
		when(contractRepository.findById(1L)).thenReturn(Optional.of(
				contract(new BigDecimal("500000000"), new BigDecimal("500000000"))));
		when(milestoneRepository.findByContractIdOrderByExpectedDateAscIdAsc(1L)).thenReturn(List.of(
				milestone(new BigDecimal("100000000"), ContractMilestoneStatus.INVOICED)));

		ContractUsageRes usage = service.getUsage(1L);

		assertThat(usage.nearLimit()).isFalse();
		assertThat(usage.overLimit()).isFalse();
	}

	@Test
	@DisplayName("Hop dong khong ton tai thi bao RESOURCE_NOT_FOUND")
	void throwsWhenContractMissing() {
		when(contractRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.getUsage(99L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}
}
