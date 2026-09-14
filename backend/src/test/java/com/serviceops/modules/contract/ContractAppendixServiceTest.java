package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.contract.dto.request.ContractAppendixCreateReq;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractAppendix;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractAppendixRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractAppendixServiceImpl;
import com.serviceops.modules.contract.validator.ContractLimitValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContractAppendixServiceTest {

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private ContractAppendixRepository appendixRepository;

	@Mock
	private ContractAuditLogger auditLogger;

	private ContractAppendixServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ContractAppendixServiceImpl(contractRepository, appendixRepository, auditLogger,
				new ContractLimitValidator());
	}

	@Test
	void createsAppendixAndUpdatesContractValue() {
		Contract contract = contract(5L, ContractStatus.ACTIVE, "500000000.00");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(appendixRepository.save(any(ContractAppendix.class))).thenAnswer(invocation -> {
			ContractAppendix appendix = invocation.getArgument(0);
			appendix.setId(101L);
			return appendix;
		});

		var response = service.create(5L, new ContractAppendixCreateReq(
				"Mo rong pham vi trien khai", new BigDecimal("200000000"), LocalDate.of(2026, 10, 1)));

		assertThat(response.valueBefore()).isEqualByComparingTo("500000000.00");
		assertThat(response.valueAfter()).isEqualByComparingTo("700000000.00");
		assertThat(contract.getTotalValue()).isEqualByComparingTo("700000000.00");
		verify(contractRepository).save(contract);
		verify(auditLogger).record(5L, ContractAuditAction.APPENDIX_CREATE,
				"Lap phu luc dieu chinh gia tri 200000000.00, gia tri hop dong 500000000.00 -> 700000000.00, hieu luc tu 2026-10-01");
	}

	@Test
	void rejectsAppendixForNonActiveContract() {
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract(5L, ContractStatus.DRAFT, "500000000.00")));

		assertThatThrownBy(() -> service.create(5L, new ContractAppendixCreateReq(
				"Dieu chinh", new BigDecimal("1000000"), LocalDate.of(2026, 10, 1))))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("ACTIVE");
		verify(appendixRepository, never()).save(any());
	}

	@Test
	void rejectsAdjustmentThatExceedsContractLimit() {
		Contract contract = contract(5L, ContractStatus.ACTIVE, "500000000.00");
		contract.setLimitValue(new BigDecimal("600000000.00"));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));

		assertThatThrownBy(() -> service.create(5L, new ContractAppendixCreateReq(
				"Tang gia tri", new BigDecimal("200000000"), LocalDate.of(2026, 10, 1))))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("Han muc tran");
		verify(appendixRepository, never()).save(any());
	}

	@Test
	void rejectsDecreaseThatMakesContractNegative() {
		Contract contract = contract(5L, ContractStatus.ACTIVE, "500000000.00");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));

		assertThatThrownBy(() -> service.create(5L, new ContractAppendixCreateReq(
				"Giam gia", new BigDecimal("-600000000"), LocalDate.of(2026, 10, 1))))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("khong duoc am");
	}

	private Contract contract(Long id, ContractStatus status, String totalValue) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setStatus(status);
		contract.setTotalValue(new BigDecimal(totalValue));
		return contract;
	}
}