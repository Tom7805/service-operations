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
import static org.mockito.ArgumentMatchers.eq;
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

	@Test
	void advancesMilestoneStatusOneStepForwardAndAuditsTheChange() {
		Contract contract = contract(5L, "1000000000.00");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		ContractMilestone milestone = milestone(7L, 5L, "Tam ung");
		when(milestoneRepository.findById(7L)).thenReturn(Optional.of(milestone));
		when(milestoneRepository.save(any(ContractMilestone.class))).thenAnswer(inv -> inv.getArgument(0));

		var res = service.updateStatus(5L, 7L,
				com.serviceops.modules.contract.enums.ContractMilestoneStatus.READY_TO_INVOICE);

		assertThat(res.status()).isEqualTo("READY_TO_INVOICE");
		verify(auditLogger).record(eq(5L),
				eq(com.serviceops.modules.contract.enums.ContractAuditAction.MILESTONE_STATUS_UPDATE), any());
	}

	@Test
	void rejectsSkippingAheadInMilestoneStatus() {
		Contract contract = contract(5L, "1000000000.00");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		ContractMilestone milestone = milestone(7L, 5L, "Tam ung");
		when(milestoneRepository.findById(7L)).thenReturn(Optional.of(milestone));

		assertThatThrownBy(() -> service.updateStatus(5L, 7L,
				com.serviceops.modules.contract.enums.ContractMilestoneStatus.INVOICED))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("PENDING -> READY_TO_INVOICE -> INVOICED");

		verify(milestoneRepository, never()).save(any());
	}

	@Test
	void rejectsMilestoneStatusUpdateWhenMilestoneBelongsToAnotherContract() {
		Contract contract = contract(5L, "1000000000.00");
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		ContractMilestone milestone = milestone(7L, 9L, "Tam ung");
		when(milestoneRepository.findById(7L)).thenReturn(Optional.of(milestone));

		assertThatThrownBy(() -> service.updateStatus(5L, 7L,
				com.serviceops.modules.contract.enums.ContractMilestoneStatus.READY_TO_INVOICE))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("khong thuoc hop dong");
	}

	private ContractMilestone milestone(Long id, Long contractId, String name) {
		ContractMilestone milestone = new ContractMilestone();
		milestone.setId(id);
		milestone.setContractId(contractId);
		milestone.setName(name);
		milestone.setAmount(new BigDecimal("300000000.00"));
		milestone.setStatus(com.serviceops.modules.contract.enums.ContractMilestoneStatus.PENDING);
		return milestone;
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
