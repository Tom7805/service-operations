package com.serviceops.modules.invoice;

import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.entity.UserRoleScope;
import com.serviceops.modules.invoice.dto.request.RecurringInvoiceRunReq;
import com.serviceops.modules.invoice.dto.request.RecurringScheduleReq;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceRunRes;
import com.serviceops.modules.invoice.dto.response.RecurringScheduleRes;
import com.serviceops.modules.invoice.entity.RecurringInvoiceSchedule;
import com.serviceops.modules.invoice.repository.RecurringInvoiceScheduleRepository;
import com.serviceops.modules.invoice.service.RecurringInvoiceService;
import com.serviceops.modules.invoice.service.impl.RecurringInvoiceServiceImpl;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/**
 * Chay {@link RecurringInvoiceServiceImpl} tren JPA THAT (H2) — cac unit test mock repository khong bao gio
 * thuc thi truy van tong luy ke (QTN-19) hay rang buoc UNIQUE(contract_id) cua bang {@code recurring_invoice_schedules}
 * (V80). Phu TC-01 cua NCL-10-CN-005: lap dung hoa don nhap vao ngay lap trong thang va chan khai bao trung dieu khoan.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({RecurringInvoiceServiceImpl.class, ContractValueLimitValidator.class,
		RecurringInvoiceIntegrationTest.ClockConfig.class})
class RecurringInvoiceIntegrationTest {

	@TestConfiguration
	static class ClockConfig {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-09-05T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}
	}

	@MockBean private AuditLogService auditLogService;
	@MockBean private com.serviceops.modules.notification.service.NotificationService notificationService;

	@Autowired private TestEntityManager em;
	@Autowired private RecurringInvoiceService service;
	@Autowired private RecurringInvoiceScheduleRepository scheduleRepository;

	@Test
	@DisplayName("NCL-10-CN-005-TC-01: den ngay lap trong thang -> tao hoa don nhap dung gia tri va ghi ky da sinh")
	void generatesDraftInvoiceOnBillingDayAndMarksPeriodAsGenerated() {
		Contract contract = maintenanceContract("1000000000.00");
		service.createSchedule(contract.getId(),
				new RecurringScheduleReq(5, new BigDecimal("20000000.00"), "Goi ho tro thang", true));
		em.flush();
		em.clear();

		User accountant = accountant("ketoan01");

		RecurringInvoiceRunRes res = service.run(new RecurringInvoiceRunReq(LocalDate.of(2026, 9, 5)));

		assertThat(res.created()).hasSize(1);
		assertThat(res.created().get(0).amount()).isEqualByComparingTo("20000000.00");
		assertThat(res.skipped()).isEmpty();
		RecurringInvoiceSchedule saved = scheduleRepository.findByContractId(contract.getId()).orElseThrow();
		assertThat(saved.getLastGeneratedPeriod()).isEqualTo("2026-09");
		// TC-01: "bao cho ke toan" phai la mot thong bao chu dong, khong chi la dong nhat ky tra cuu duoc.
		verify(notificationService).sendInAppNotification(eq(accountant.getId()),
				eq(com.serviceops.modules.notification.enums.NotificationType.RECURRING_INVOICE_GENERATED), any(),
				any(), eq(res.created().get(0).id()), any());
	}

	private User accountant(String username) {
		User user = new User();
		user.setUsername(username);
		user.setPasswordHash("x");
		user.setFullName(username);
		em.persist(user);
		Role role = new Role();
		role.setCode("VT-05");
		role.setName("Ke toan");
		em.persist(role);
		UserRoleScope scope = new UserRoleScope();
		scope.setUser(user);
		scope.setRole(role);
		scope.setScopeType("COMPANY");
		em.persist(scope);
		em.flush();
		return user;
	}

	@Test
	@DisplayName("Chay lai trong cung ngay khong tao trung hoa don cho cung mot ky")
	void doesNotDuplicateInvoiceWhenRunTwiceOnTheSameDay() {
		Contract contract = maintenanceContract("1000000000.00");
		service.createSchedule(contract.getId(),
				new RecurringScheduleReq(5, new BigDecimal("20000000.00"), null, true));
		em.flush();

		service.run(new RecurringInvoiceRunReq(LocalDate.of(2026, 9, 5)));
		RecurringInvoiceRunRes second = service.run(new RecurringInvoiceRunReq(LocalDate.of(2026, 9, 5)));

		assertThat(second.created()).isEmpty();
	}

	@Test
	@DisplayName("QTN-19: vuot gia tri hop dong -> bo qua ky nay kem ly do, khong tao hoa don")
	void skipsWhenAccumulatedInvoicesWouldExceedContractValue() {
		Contract contract = maintenanceContract("15000000.00");
		service.createSchedule(contract.getId(),
				new RecurringScheduleReq(5, new BigDecimal("20000000.00"), null, true));
		em.flush();

		RecurringInvoiceRunRes res = service.run(new RecurringInvoiceRunReq(LocalDate.of(2026, 9, 5)));

		assertThat(res.created()).isEmpty();
		assertThat(res.skipped()).singleElement().satisfies(skip -> {
			assertThat(skip.contractId()).isEqualTo(contract.getId());
			assertThat(skip.reason()).contains("QTN-19");
		});
	}

	@Test
	@DisplayName("Khai bao dieu khoan lan hai cho cung hop dong bi chan o service va chot UNIQUE o CSDL")
	void secondScheduleForTheSameContractIsBlockedByServiceAndByDatabase() {
		Contract contract = maintenanceContract("1000000000.00");
		service.createSchedule(contract.getId(),
				new RecurringScheduleReq(5, new BigDecimal("20000000.00"), null, true));
		em.flush();

		assertThatThrownBy(() -> service.createSchedule(contract.getId(),
				new RecurringScheduleReq(10, new BigDecimal("30000000.00"), null, true)))
				.isInstanceOf(BusinessRuleException.class);

		RecurringInvoiceSchedule duplicate = new RecurringInvoiceSchedule();
		duplicate.setContractId(contract.getId());
		duplicate.setBillingDayOfMonth(15);
		duplicate.setAmount(new BigDecimal("10000000.00"));
		duplicate.setActive(true);
		duplicate.setCreatedAt(LocalDateTime.now());
		assertThatThrownBy(() -> scheduleRepository.saveAndFlush(duplicate))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	private Contract maintenanceContract(String totalValue) {
		LocalDateTime now = LocalDateTime.of(2026, 1, 1, 8, 0);
		Customer customer = new Customer();
		customer.setCode("KHM" + System.nanoTime());
		customer.setName("Khach hang duy tri");
		customer.setCreatedAt(now);
		em.persist(customer);
		Contract contract = new Contract();
		contract.setContractCode("HDM" + System.nanoTime());
		contract.setName("Hop dong duy tri");
		contract.setCustomerId(customer.getId());
		contract.setContractType(ContractType.MAINTENANCE);
		contract.setTotalValue(new BigDecimal(totalValue));
		contract.setCreatedAt(now);
		em.persist(contract);
		em.flush();
		return contract;
	}
}
