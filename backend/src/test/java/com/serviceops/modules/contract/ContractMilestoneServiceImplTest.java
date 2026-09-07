package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.MilestoneCreateReq;
import com.serviceops.modules.contract.dto.request.MilestoneItemReq;
import com.serviceops.modules.contract.dto.response.MilestoneRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.enums.MilestoneStatus;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.mapper.MilestoneMapper;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractMilestoneServiceImpl;
import com.serviceops.modules.contract.validator.MilestoneTotalValidator;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test ContractMilestoneServiceImpl - NCL-04-CN-003 (Quan ly moc thanh
 * toan cua hop dong): TC-01 luong thanh cong (ba moc 30/30/40%, quy doi ty le
 * thanh so tien, thay the toan bo danh sach cu), TC-02 tong vuot gia tri hop
 * dong thi tu choi luu, TC-04 ghi nhat ky MILESTONE_UPDATE, va cac truong hop
 * ngoai le (khong tim thay hop dong, thieu ca ty le lan so tien).
 */
@ExtendWith(MockitoExtension.class)
class ContractMilestoneServiceImplTest {

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private ContractMilestoneRepository milestoneRepository;

	@Mock
	private MilestoneTotalValidator milestoneTotalValidator;

	@Mock
	private ContractAuditLogger contractAuditLogger;

	private final MilestoneMapper milestoneMapper = new MilestoneMapper();

	private ContractMilestoneServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ContractMilestoneServiceImpl(contractRepository, milestoneRepository,
				milestoneMapper, milestoneTotalValidator, contractAuditLogger);
		SecurityContextHolder.getContext().setAuthentication(
				new TestingAuthenticationToken("ke_toan01", "n/a"));
	}

	private Contract contract(long id, String totalValue) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setContractCode("HD-TEST");
		contract.setName("Hop dong ERP");
		contract.setCustomerId(1L);
		contract.setContractType(ContractType.FIXED_PRICE);
		contract.setTotalValue(new BigDecimal(totalValue));
		contract.setStatus(ContractStatus.DRAFT);
		return contract;
	}

	private MilestoneCreateReq threeEvenPercentageMilestones() {
		return new MilestoneCreateReq(List.of(
				new MilestoneItemReq("Tam ung", new BigDecimal("30"), null,
						LocalDate.of(2026, 10, 15), "Ky hop dong"),
				new MilestoneItemReq("Nghiem thu giai doan 1", new BigDecimal("30"), null,
						LocalDate.of(2027, 1, 15), "Ban giao module loi"),
				new MilestoneItemReq("Nghiem thu cuoi cung", new BigDecimal("40"), null,
						LocalDate.of(2027, 6, 30), "Nghiem thu toan bo he thong")));
	}

	@Test
	@DisplayName("TC-01: tao ba moc 30/30/40% thanh cong, quy doi ty le thanh so tien va tong dung bang gia tri hop dong")
	void createsThreeMilestonesFromPercentages() {
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract(5L, "1000000000")));
		when(milestoneRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

		List<MilestoneRes> res = service.replaceMilestones(5L, threeEvenPercentageMilestones());

		assertThat(res).hasSize(3);
		assertThat(res.get(0).amount()).isEqualByComparingTo("300000000");
		assertThat(res.get(1).amount()).isEqualByComparingTo("300000000");
		assertThat(res.get(2).amount()).isEqualByComparingTo("400000000");
		assertThat(res).allMatch(m -> m.status().equals(MilestoneStatus.PLANNED.name()));
		assertThat(res.get(0).sortOrder()).isZero();
		assertThat(res.get(2).sortOrder()).isEqualTo(2);

		verify(milestoneRepository).deleteByContractId(5L);
		verify(milestoneTotalValidator).validate(eq(new BigDecimal("1000000000")), anyList());
	}

	@Test
	@DisplayName("Nhap truc tiep so tien (khong nhap ty le) van luu dung so tien da nhap")
	void acceptsDirectAmountWithoutPercentage() {
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract(5L, "500000000")));
		when(milestoneRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

		MilestoneCreateReq request = new MilestoneCreateReq(List.of(
				new MilestoneItemReq("Mot lan", null, new BigDecimal("500000000"), null, null)));
		List<MilestoneRes> res = service.replaceMilestones(5L, request);

		assertThat(res.get(0).amount()).isEqualByComparingTo("500000000");
		assertThat(res.get(0).percentage()).isNull();
	}

	@Test
	@DisplayName("TC-02: tong cac moc vuot gia tri hop dong thi tu choi luu va khong xoa/ghi nhat ky")
	void rejectsWhenTotalValidatorFails() {
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract(5L, "1000000000")));
		org.mockito.Mockito.doThrow(new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
						"Tong cac moc thanh toan phai dung bang gia tri hop dong"))
				.when(milestoneTotalValidator).validate(any(), anyList());

		MilestoneCreateReq request = new MilestoneCreateReq(List.of(
				new MilestoneItemReq("Vuot muc", null, new BigDecimal("1500000000"), null, null)));

		assertThatThrownBy(() -> service.replaceMilestones(5L, request))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(milestoneRepository, never()).deleteByContractId(any());
		verify(milestoneRepository, never()).saveAll(any());
		verify(contractAuditLogger, never()).record(any(), any(), any());
	}

	@Test
	@DisplayName("Thieu ca ty le lan so tien cho mot moc thi bao VALIDATION_ERROR")
	void rejectsMilestoneMissingBothPercentageAndAmount() {
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract(5L, "1000000000")));

		MilestoneCreateReq request = new MilestoneCreateReq(List.of(
				new MilestoneItemReq("Thieu du lieu", null, null, null, null)));

		assertThatThrownBy(() -> service.replaceMilestones(5L, request))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(milestoneRepository, never()).saveAll(any());
	}

	@Test
	@DisplayName("Khong tim thay hop dong thi bao RESOURCE_NOT_FOUND")
	void rejectsWhenContractMissing() {
		when(contractRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.replaceMilestones(99L, threeEvenPercentageMilestones()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("TC-04: luu thanh cong thi ghi nhat ky MILESTONE_UPDATE kem so luong moc va tong gia tri")
	void recordsMilestoneUpdateAuditLog() {
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract(5L, "1000000000")));
		when(milestoneRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

		service.replaceMilestones(5L, threeEvenPercentageMilestones());

		ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
		verify(contractAuditLogger).record(eq(5L), eq(ContractAuditAction.MILESTONE_UPDATE), detailCaptor.capture());
		assertThat(detailCaptor.getValue()).contains("3").contains("1000000000");
	}

	@Test
	@DisplayName("Danh sach moc tra ve dung thu tu hien thi cua hop dong")
	void listsMilestonesInOrder() {
		when(contractRepository.existsById(5L)).thenReturn(true);
		ContractMilestone first = new ContractMilestone();
		first.setId(1L);
		first.setContractId(5L);
		first.setName("Tam ung");
		first.setAmount(new BigDecimal("300000000"));
		first.setSortOrder(0);
		when(milestoneRepository.findByContractIdOrderBySortOrderAsc(5L)).thenReturn(List.of(first));

		List<MilestoneRes> res = service.list(5L);

		assertThat(res).hasSize(1);
		assertThat(res.get(0).name()).isEqualTo("Tam ung");
	}

	@Test
	@DisplayName("Danh sach moc cua hop dong khong ton tai thi bao RESOURCE_NOT_FOUND")
	void rejectsListingWhenContractMissing() {
		when(contractRepository.existsById(99L)).thenReturn(false);

		assertThatThrownBy(() -> service.list(99L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}
}
