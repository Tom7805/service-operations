package com.serviceops.modules.rate;

import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.rate.dto.request.BillRateUpdateReq;
import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.dto.response.ContractBillRateRes;
import com.serviceops.modules.rate.entity.BillRate;
import com.serviceops.modules.rate.entity.ContractBillRate;
import com.serviceops.modules.rate.repository.BillRateRepository;
import com.serviceops.modules.rate.repository.ContractBillRateRepository;
import com.serviceops.modules.rate.service.BillRateService;
import com.serviceops.modules.rate.service.impl.BillRateServiceImpl;
import com.serviceops.modules.rate.service.impl.ContractBillRateServiceImpl;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Sua don gia (bang chung va rieng theo hop dong): chi sua truc tiep dong chua ap dung truoc hom nay; dong da
 * ap dung tu truoc bi tu choi de khong lam doi doanh thu cac ky da tinh (doanh thu tinh dong tu don gia, QTN-15).
 */
@ExtendWith(MockitoExtension.class)
class RateEditServiceTest {

	private static final LocalDate TODAY = LocalDate.now();

	@Mock
	private BillRateRepository billRateRepository;
	@Mock
	private ContractBillRateRepository contractBillRateRepository;
	@Mock
	private ContractRepository contractRepository;
	@Mock
	private BillRateService billRateService;
	@Mock
	private AuditLogService auditLogService;

	private static BillRate billRate(long id, String daily, LocalDate from) {
		BillRate r = new BillRate();
		r.setId(id);
		r.setProfessionalRole("Lập trình viên");
		r.setLevel("Cao cấp");
		r.setDailyRate(new BigDecimal(daily));
		r.setEffectiveFrom(from);
		return r;
	}

	private static ContractBillRate contractRate(long id, long contractId, String daily, LocalDate from) {
		ContractBillRate r = new ContractBillRate();
		r.setId(id);
		r.setContractId(contractId);
		r.setProfessionalRole("Lập trình viên");
		r.setLevel("Cao cấp");
		r.setDailyRate(new BigDecimal(daily));
		r.setEffectiveFrom(from);
		return r;
	}

	private BillRateServiceImpl billService() {
		return new BillRateServiceImpl(billRateRepository, auditLogService);
	}

	private ContractBillRateServiceImpl contractService() {
		return new ContractBillRateServiceImpl(contractBillRateRepository, contractRepository, billRateService, auditLogService);
	}

	@Test
	@DisplayName("Sua nham dong khai bao hom nay: doi gia ngay tai cho, ghi nhat ky, tra id")
	void editsRateDeclaredToday() {
		BillRate rate = billRate(7L, "4000000", TODAY);
		when(billRateRepository.findById(7L)).thenReturn(Optional.of(rate));
		when(billRateRepository.findByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(
				"Lập trình viên", "Cao cấp", TODAY)).thenReturn(Optional.of(rate));
		when(billRateRepository.save(any(BillRate.class))).thenAnswer(inv -> inv.getArgument(0));

		BillRateRes res = billService().update(7L, new BillRateUpdateReq(new BigDecimal("3600000"), TODAY));

		assertThat(res.id()).isEqualTo(7L);
		assertThat(res.dailyRate()).isEqualByComparingTo("3600000");
		assertThat(res.effectiveFrom()).isEqualTo(TODAY);
		verify(auditLogService).record(eq("Sửa đơn giá theo vai trò"), any(), eq(7L), anyString(), anyString());
	}

	@Test
	@DisplayName("Dong da ap dung tu truoc hom nay: tu choi sua de, khong luu")
	void rejectsEditingRateAlreadyInEffect() {
		when(billRateRepository.findById(3L)).thenReturn(Optional.of(billRate(3L, "2500000", LocalDate.of(2024, 1, 1))));

		assertThatThrownBy(() -> billService().update(3L, new BillRateUpdateReq(new BigDecimal("2600000"), TODAY)))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("đã áp dụng từ 01/01/2024")
				.extracting(e -> ((BusinessRuleException) e).getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE);
		verify(billRateRepository, never()).save(any());
	}

	@Test
	@DisplayName("Khong duoc lui ngay hieu luc ve truoc hom nay khi sua")
	void rejectsBackdatingEffectiveDate() {
		when(billRateRepository.findById(7L)).thenReturn(Optional.of(billRate(7L, "4000000", TODAY.plusDays(5))));

		assertThatThrownBy(() -> billService().update(7L,
				new BillRateUpdateReq(new BigDecimal("4000000"), TODAY.minusDays(1))))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("không được trước hôm nay");
		verify(billRateRepository, never()).save(any());
	}

	@Test
	@DisplayName("Doi sang ngay da co dong khac cung vai tro/cap bac: bao trung")
	void rejectsMovingOntoAnotherRowsDate() {
		LocalDate target = TODAY.plusDays(10);
		when(billRateRepository.findById(7L)).thenReturn(Optional.of(billRate(7L, "4000000", TODAY.plusDays(5))));
		when(billRateRepository.findByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(
				"Lập trình viên", "Cao cấp", target)).thenReturn(Optional.of(billRate(8L, "4200000", target)));

		assertThatThrownBy(() -> billService().update(7L, new BillRateUpdateReq(new BigDecimal("4000000"), target)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_DATA);
	}

	@Test
	@DisplayName("Don gia rieng theo hop dong: sua duoc dong chua ap dung, dung hop dong")
	void editsContractRate() {
		ContractBillRate rate = contractRate(11L, 5L, "3800000", TODAY.plusDays(1));
		when(contractBillRateRepository.findById(11L)).thenReturn(Optional.of(rate));
		when(contractBillRateRepository.findByContractIdAndProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(
				anyLong(), anyString(), anyString(), any())).thenReturn(Optional.empty());
		when(contractBillRateRepository.save(any(ContractBillRate.class))).thenAnswer(inv -> inv.getArgument(0));

		ContractBillRateRes res = contractService().update(5L, 11L,
				new BillRateUpdateReq(new BigDecimal("3600000"), TODAY));

		assertThat(res.id()).isEqualTo(11L);
		assertThat(res.dailyRate()).isEqualByComparingTo("3600000");
		assertThat(res.effectiveFrom()).isEqualTo(TODAY);
	}

	@Test
	@DisplayName("Don gia rieng thuoc hop dong khac: khong tim thay, khong sua cheo hop dong")
	void rejectsContractRateFromAnotherContract() {
		when(contractBillRateRepository.findById(11L)).thenReturn(Optional.of(contractRate(11L, 9L, "3800000", TODAY)));

		assertThatThrownBy(() -> contractService().update(5L, 11L,
				new BillRateUpdateReq(new BigDecimal("3600000"), TODAY)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
		verify(contractBillRateRepository, never()).save(any());
	}

	@Test
	@DisplayName("Don gia rieng da ap dung tu truoc: tu choi sua de")
	void rejectsEditingContractRateInEffect() {
		when(contractBillRateRepository.findById(11L))
				.thenReturn(Optional.of(contractRate(11L, 5L, "3800000", TODAY.minusDays(3))));

		assertThatThrownBy(() -> contractService().update(5L, 11L,
				new BillRateUpdateReq(new BigDecimal("3600000"), TODAY)))
				.extracting(e -> ((BusinessRuleException) e).getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE);
	}
}
