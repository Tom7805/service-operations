package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.AmendmentCreateReq;
import com.serviceops.modules.contract.dto.response.AmendmentRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractAmendment;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.mapper.AmendmentMapper;
import com.serviceops.modules.contract.repository.ContractAmendmentRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractAmendmentServiceImpl;
import com.serviceops.modules.contract.validator.ContractLimitValidator;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test ContractAmendmentServiceImpl - NCL-04-CN-004 (Lap phu luc dieu
 * chinh hop dong): TC-01 luong thanh cong (dieu chinh gia tri va/hoac thoi
 * han, ap dung len hop dong, sinh so phu luc theo thu tu), TC-02 thieu ca hai
 * noi dung dieu chinh hoac gia tri moi vuot han muc tran thi tu choi luu,
 * TC-04 ghi nhat ky AMENDMENT_CREATE, va cac truong hop ngoai le (khong tim
 * thay hop dong, ngay ket thuc moi som hon ngay bat dau).
 */
@ExtendWith(MockitoExtension.class)
class ContractAmendmentServiceImplTest {

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private ContractAmendmentRepository amendmentRepository;

	@Mock
	private ContractLimitValidator contractLimitValidator;

	@Mock
	private ContractAuditLogger contractAuditLogger;

	private final AmendmentMapper amendmentMapper = new AmendmentMapper();

	private ContractAmendmentServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ContractAmendmentServiceImpl(contractRepository, amendmentRepository,
				amendmentMapper, contractLimitValidator, contractAuditLogger);
		SecurityContextHolder.getContext().setAuthentication(
				new TestingAuthenticationToken("ke_toan01", "n/a"));
	}

	private Contract contract(long id, String totalValue, LocalDate startDate, LocalDate endDate) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setContractCode("HD-TEST");
		contract.setName("Hop dong ERP");
		contract.setCustomerId(1L);
		contract.setContractType(ContractType.FIXED_PRICE);
		contract.setTotalValue(new BigDecimal(totalValue));
		contract.setStartDate(startDate);
		contract.setEndDate(endDate);
		contract.setStatus(ContractStatus.ACTIVE);
		return contract;
	}

	@Test
	@DisplayName("TC-01: dieu chinh ca gia tri va thoi han thanh cong, ap dung len hop dong va sinh so phu luc PL-01")
	void createsAmendmentAdjustingValueAndEndDate() {
		Contract contract = contract(5L, "1000000000", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(amendmentRepository.countByContractId(5L)).thenReturn(0L);
		when(amendmentRepository.save(any(ContractAmendment.class))).thenAnswer(inv -> inv.getArgument(0));

		AmendmentCreateReq request = new AmendmentCreateReq("Bo sung khoi luong cong viec",
				LocalDate.of(2026, 6, 1), new BigDecimal("1200000000"), LocalDate.of(2027, 6, 30), "Phu luc 01");

		AmendmentRes res = service.create(5L, request);

		assertThat(res.amendmentNo()).isEqualTo("PL-HD-TEST-01");
		assertThat(res.oldTotalValue()).isEqualByComparingTo("1000000000");
		assertThat(res.newTotalValue()).isEqualByComparingTo("1200000000");
		assertThat(res.oldEndDate()).isEqualTo(LocalDate.of(2026, 12, 31));
		assertThat(res.newEndDate()).isEqualTo(LocalDate.of(2027, 6, 30));

		assertThat(contract.getTotalValue()).isEqualByComparingTo("1200000000");
		assertThat(contract.getEndDate()).isEqualTo(LocalDate.of(2027, 6, 30));
		verify(contractRepository).save(contract);
		verify(contractLimitValidator).validate(eq(new BigDecimal("1200000000")), eq(contract.getLimitValue()));
	}

	@Test
	@DisplayName("Chi dieu chinh thoi han (khong dieu chinh gia tri) van luu thanh cong, khong ghi old/new gia tri")
	void createsAmendmentAdjustingOnlyEndDate() {
		Contract contract = contract(5L, "1000000000", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(amendmentRepository.countByContractId(5L)).thenReturn(1L);
		when(amendmentRepository.save(any(ContractAmendment.class))).thenAnswer(inv -> inv.getArgument(0));

		AmendmentCreateReq request = new AmendmentCreateReq("Gia han tien do", LocalDate.of(2026, 12, 1),
				null, LocalDate.of(2027, 3, 31), null);

		AmendmentRes res = service.create(5L, request);

		assertThat(res.amendmentNo()).isEqualTo("PL-HD-TEST-02");
		assertThat(res.newTotalValue()).isNull();
		assertThat(res.oldTotalValue()).isNull();
		assertThat(res.newEndDate()).isEqualTo(LocalDate.of(2027, 3, 31));
		assertThat(contract.getTotalValue()).isEqualByComparingTo("1000000000");
		assertThat(contract.getEndDate()).isEqualTo(LocalDate.of(2027, 3, 31));
	}

	@Test
	@DisplayName("TC-02: thieu ca gia tri moi lan thoi han moi thi tu choi voi VALIDATION_ERROR")
	void rejectsWhenNoAdjustmentProvided() {
		when(contractRepository.findById(5L)).thenReturn(Optional.of(
				contract(5L, "1000000000", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31))));

		AmendmentCreateReq request = new AmendmentCreateReq("Khong co gi thay doi",
				LocalDate.of(2026, 6, 1), null, null, null);

		assertThatThrownBy(() -> service.create(5L, request))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(amendmentRepository, never()).save(any());
		verify(contractRepository, never()).save(any());
	}

	@Test
	@DisplayName("Ngay ket thuc moi som hon ngay bat dau hop dong thi tu choi voi INVALID_STATE")
	void rejectsWhenNewEndDateBeforeStartDate() {
		when(contractRepository.findById(5L)).thenReturn(Optional.of(
				contract(5L, "1000000000", LocalDate.of(2026, 6, 1), LocalDate.of(2026, 12, 31))));

		AmendmentCreateReq request = new AmendmentCreateReq("Rut ngan thoi han", LocalDate.of(2026, 6, 1),
				null, LocalDate.of(2026, 1, 1), null);

		assertThatThrownBy(() -> service.create(5L, request))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);

		verify(amendmentRepository, never()).save(any());
	}

	@Test
	@DisplayName("TC-02/QTN-19: gia tri moi vuot han muc tran da khai bao thi tu choi luu")
	void rejectsWhenNewTotalValueExceedsLimit() {
		Contract contract = contract(5L, "1000000000", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
		contract.setLimitValue(new BigDecimal("1100000000"));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		org.mockito.Mockito.doThrow(new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
						"Han muc tran khong duoc nho hon gia tri hop dong (QTN-19)"))
				.when(contractLimitValidator).validate(any(), any());

		AmendmentCreateReq request = new AmendmentCreateReq("Tang gia tri vuot han muc",
				LocalDate.of(2026, 6, 1), new BigDecimal("1200000000"), null, null);

		assertThatThrownBy(() -> service.create(5L, request))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(amendmentRepository, never()).save(any());
		verify(contractRepository, never()).save(any());
	}

	@Test
	@DisplayName("Khong tim thay hop dong thi bao RESOURCE_NOT_FOUND")
	void rejectsWhenContractMissing() {
		when(contractRepository.findById(99L)).thenReturn(Optional.empty());

		AmendmentCreateReq request = new AmendmentCreateReq("Ly do", LocalDate.of(2026, 6, 1),
				new BigDecimal("100"), null, null);

		assertThatThrownBy(() -> service.create(99L, request))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("TC-04: luu thanh cong thi ghi nhat ky AMENDMENT_CREATE kem so phu luc va noi dung dieu chinh")
	void recordsAmendmentCreateAuditLog() {
		Contract contract = contract(5L, "1000000000", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(amendmentRepository.countByContractId(5L)).thenReturn(0L);
		when(amendmentRepository.save(any(ContractAmendment.class))).thenAnswer(inv -> inv.getArgument(0));

		AmendmentCreateReq request = new AmendmentCreateReq("Bo sung khoi luong cong viec",
				LocalDate.of(2026, 6, 1), new BigDecimal("1200000000"), null, null);

		service.create(5L, request);

		ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
		verify(contractAuditLogger).record(eq(5L), eq(ContractAuditAction.AMENDMENT_CREATE), detailCaptor.capture());
		assertThat(detailCaptor.getValue()).contains("PL-HD-TEST-01").contains("1000000000").contains("1200000000");
	}

	@Test
	@DisplayName("Lich su phu luc tra ve dung danh sach cua hop dong")
	void listsAmendmentsForContract() {
		when(contractRepository.existsById(5L)).thenReturn(true);
		ContractAmendment amendment = new ContractAmendment();
		amendment.setId(1L);
		amendment.setContractId(5L);
		amendment.setAmendmentNo("PL-HD-TEST-01");
		amendment.setReason("Bo sung khoi luong cong viec");
		when(amendmentRepository.findByContractIdOrderByCreatedAtDesc(5L)).thenReturn(List.of(amendment));

		List<AmendmentRes> res = service.list(5L);

		assertThat(res).hasSize(1);
		assertThat(res.get(0).amendmentNo()).isEqualTo("PL-HD-TEST-01");
	}

	@Test
	@DisplayName("Lich su phu luc cua hop dong khong ton tai thi bao RESOURCE_NOT_FOUND")
	void rejectsListingWhenContractMissing() {
		when(contractRepository.existsById(99L)).thenReturn(false);

		assertThatThrownBy(() -> service.list(99L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}
}
