package com.serviceops.modules.rate;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.rate.dto.request.ContractBillRateCreateReq;
import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.dto.response.ContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;
import com.serviceops.modules.rate.entity.ContractBillRate;
import com.serviceops.modules.rate.repository.ContractBillRateRepository;
import com.serviceops.modules.rate.service.BillRateService;
import com.serviceops.modules.rate.service.impl.ContractBillRateServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContractBillRateServiceImplTest {

	@Mock
	private ContractBillRateRepository contractBillRateRepository;

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private BillRateService billRateService;

	@Mock
	private AuditLogService auditLogService;

	@InjectMocks
	private ContractBillRateServiceImpl service;

	@Test
	@DisplayName("TC-01: Hop dong co don gia rieng cho vai tro lap trinh vien thi dung don gia rieng")
	void usesContractSpecificRateWhenAvailable() {
		Long contractId = 1L;
		when(contractRepository.existsById(contractId)).thenReturn(true);

		ContractBillRate specificRate = new ContractBillRate();
		specificRate.setContractId(contractId);
		specificRate.setProfessionalRole("Lập trình viên");
		specificRate.setLevel("Cao cấp");
		specificRate.setDailyRate(new BigDecimal("3000000"));
		specificRate.setEffectiveFrom(LocalDate.of(2026, 1, 1));

		when(contractBillRateRepository
				.findTopByContractIdAndProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
						contractId, "Lập trình viên", "Cao cấp", LocalDate.of(2026, 6, 30)))
				.thenReturn(Optional.of(specificRate));

		ResolvedContractBillRateRes result = service.resolve(contractId, "Lập trình viên", "Cao cấp", LocalDate.of(2026, 6, 30));

		assertThat(result.dailyRate()).isEqualByComparingTo("3000000");
		assertThat(result.effectiveFrom()).isEqualTo(LocalDate.of(2026, 1, 1));
		assertThat(result.isContractSpecific()).isTrue();
		verify(billRateService, never()).resolve(anyString(), anyString(), any());
	}

	@Test
	@DisplayName("TC-02: Hop dong khong khai bao don gia rieng thi quay ve dung bang don gia chung cua cong ty")
	void fallsBackToCompanyGeneralRateWhenNoSpecificRateExists() {
		Long contractId = 1L;
		when(contractRepository.existsById(contractId)).thenReturn(true);

		when(contractBillRateRepository
				.findTopByContractIdAndProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
						contractId, "Kiểm thử", "Trung cấp", LocalDate.of(2026, 6, 30)))
				.thenReturn(Optional.empty());

		BillRateRes generalRate = new BillRateRes("Kiểm thử", "Trung cấp", new BigDecimal("1600000"), LocalDate.of(2024, 1, 1));
		when(billRateService.resolve("Kiểm thử", "Trung cấp", LocalDate.of(2026, 6, 30))).thenReturn(generalRate);

		ResolvedContractBillRateRes result = service.resolve(contractId, "Kiểm thử", "Trung cấp", LocalDate.of(2026, 6, 30));

		assertThat(result.dailyRate()).isEqualByComparingTo("1600000");
		assertThat(result.effectiveFrom()).isEqualTo(LocalDate.of(2024, 1, 1));
		assertThat(result.isContractSpecific()).isFalse();
	}

	@Test
	@DisplayName("TC-04: Khai bao don gia rieng hop dong thanh cong va ghi audit log")
	void createsContractBillRateSuccessfullyAndRecordsAuditLog() {
		Long contractId = 1L;
		when(contractRepository.existsById(contractId)).thenReturn(true);
		when(contractBillRateRepository.findByContractIdAndProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(
				contractId, "Lập trình viên", "Cao cấp", LocalDate.of(2026, 1, 1))).thenReturn(Optional.empty());

		when(contractBillRateRepository.save(any(ContractBillRate.class))).thenAnswer(inv -> {
			ContractBillRate entity = inv.getArgument(0);
			entity.setId(10L);
			return entity;
		});

		ContractBillRateCreateReq req = new ContractBillRateCreateReq("Lập trình viên", "Cao cấp",
				new BigDecimal("3000000"), LocalDate.of(2026, 1, 1));

		ContractBillRateRes result = service.create(contractId, req);

		assertThat(result.contractId()).isEqualTo(contractId);
		assertThat(result.dailyRate()).isEqualByComparingTo("3000000");
		verify(auditLogService).record(anyString(), any(AuditTargetType.class), anyLong(), anyString(), anyString());
	}

	@Test
	@DisplayName("Trung don gia rieng bi reject DUPLICATE_DATA")
	void rejectsDuplicateContractBillRate() {
		Long contractId = 1L;
		when(contractRepository.existsById(contractId)).thenReturn(true);

		ContractBillRate existing = new ContractBillRate();
		when(contractBillRateRepository.findByContractIdAndProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(
				contractId, "Lập trình viên", "Cao cấp", LocalDate.of(2026, 1, 1))).thenReturn(Optional.of(existing));

		ContractBillRateCreateReq req = new ContractBillRateCreateReq("Lập trình viên", "Cao cấp",
				new BigDecimal("3000000"), LocalDate.of(2026, 1, 1));

		assertThatThrownBy(() -> service.create(contractId, req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode())
				.isEqualTo(ErrorCode.DUPLICATE_DATA);
	}
}
