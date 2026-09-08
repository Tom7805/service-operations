package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractExpiryReminderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit test ContractExpiryReminderServiceImpl - NCL-04-CN-006 (Nhac hop dong
 * sap het hieu luc): TC-01 hop dong con trong nguong ngay duoc liet ke sap
 * xep theo ngay het han gan nhat truoc, cac truong hop ngoai le/du lieu sai.
 */
@ExtendWith(MockitoExtension.class)
class ContractExpiryReminderServiceTest {

	@Mock
	private ContractRepository contractRepository;

	private ContractExpiryReminderServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ContractExpiryReminderServiceImpl(contractRepository);
	}

	private Contract contract(long id, String code, LocalDate endDate) {
		Contract c = new Contract();
		c.setId(id);
		c.setContractCode(code);
		c.setName("Hop dong " + code);
		c.setCustomerId(10L);
		c.setTotalValue(new BigDecimal("100000000"));
		c.setEndDate(endDate);
		c.setStatus(ContractStatus.ACTIVE);
		return c;
	}

	@Test
	@DisplayName("TC-01: liet ke hop dong con hieu luc sap het han, sap xep ngay het han gan nhat truoc")
	void listsExpiringContractsSortedByEndDate() {
		LocalDate today = LocalDate.now();
		Contract soonest = contract(1L, "HD-0001", today.plusDays(5));
		Contract later = contract(2L, "HD-0002", today.plusDays(20));
		when(contractRepository.findByStatusAndEndDateBetween(
				eq(ContractStatus.ACTIVE), eq(today), eq(today.plusDays(30))))
				.thenReturn(List.of(later, soonest));

		List<ContractExpiryAlertRes> result = service.findExpiringSoon(30);

		assertThat(result).extracting(ContractExpiryAlertRes::contractId).containsExactly(1L, 2L);
		assertThat(result.get(0).daysRemaining()).isEqualTo(5);
	}

	@Test
	@DisplayName("Khong co hop dong nao sap het han thi tra ve danh sach rong")
	void returnsEmptyWhenNoneExpiring() {
		when(contractRepository.findByStatusAndEndDateBetween(any(), any(), any())).thenReturn(List.of());

		assertThat(service.findExpiringSoon(30)).isEmpty();
	}

	@Test
	@DisplayName("So ngay ra soat am thi bao loi validation")
	void rejectsNegativeDays() {
		assertThatThrownBy(() -> service.findExpiringSoon(-1))
				.isInstanceOf(BusinessRuleException.class);
	}
}
