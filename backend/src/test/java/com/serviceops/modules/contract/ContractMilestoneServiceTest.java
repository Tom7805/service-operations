package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.contract.dto.request.ContractMilestoneReq;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractMilestoneServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContractMilestoneServiceTest {

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private ContractMilestoneRepository milestoneRepository;

	@Mock
	private ContractAuditLogger auditLogger;

	private ContractMilestoneServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ContractMilestoneServiceImpl(contractRepository, milestoneRepository, auditLogger);
		SecurityContextHolder.clearContext();
	}

	@Test
	void savesMilestonesUsingPercentageAndAuditsTheChange() {
		Contract contract = contract(5L, "1000000000.00");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(milestoneRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

		List<?> result = service.replace(5L, List.of(
				request("Giai doan 1", "30", null),
				request("Giai doan 2", "30", null),
				request("Giai doan 3", "40", null)));

		assertThat(result).hasSize(3);
		ArgumentCaptor<List<ContractMilestone>> captor = ArgumentCaptor.forClass(List.class);
		verify(milestoneRepository).saveAll(captor.capture());
		assertThat(captor.getValue()).extracting(ContractMilestone::getAmount)
				.containsExactly(new BigDecimal("300000000.00"), new BigDecimal("300000000.00"),
						new BigDecimal("400000000.00"));
		verify(auditLogger).record(5L, com.serviceops.modules.contract.enums.ContractAuditAction.MILESTONE_UPDATE,
				"Khai bao 3 moc thanh toan, tong gia tri=1000000000.00");
	}

	@Test
	void rejectsWhenMilestoneTotalDoesNotEqualContractValue() {
		Contract contract = contract(5L, "1000000000.00");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));

		assertThatThrownBy(() -> service.replace(5L, List.of(
				request("Giai doan 1", null, "300000000"),
				request("Giai doan 2", null, "600000000"))))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("Tong cac moc thanh toan phai bang gia tri hop dong");

		verify(milestoneRepository, never()).deleteByContractId(5L);
		verify(milestoneRepository, never()).saveAll(any());
	}

	@Test
	void rejectsWhenPercentageAndAmountDoNotMatch() {
		Contract contract = contract(5L, "1000000000.00");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));

		assertThatThrownBy(() -> service.replace(5L, List.of(
				request("Giai doan 1", "30", "250000000"),
				request("Giai doan 2", "70", null))))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("So tien khong khop voi ty le");
	}

	private Contract contract(Long id, String totalValue) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setTotalValue(new BigDecimal(totalValue));
		return contract;
	}

	private ContractMilestoneReq request(String name, String percentage, String amount) {
		return new ContractMilestoneReq(name,
				percentage == null ? null : new BigDecimal(percentage),
				amount == null ? null : new BigDecimal(amount), null, null);
	}
}
