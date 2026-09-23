package com.serviceops.modules.invoice;

import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.entity.UserRoleScope;
import com.serviceops.modules.invoice.dto.request.DunningRunReq;
import com.serviceops.modules.invoice.dto.response.DunningRunRes;
import com.serviceops.modules.invoice.entity.DunningLog;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.enums.DunningStage;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.DunningLogRepository;
import com.serviceops.modules.invoice.service.DunningService;
import com.serviceops.modules.invoice.service.impl.DunningServiceImpl;
import com.serviceops.modules.invoice.service.impl.InvoiceServiceImpl;
import com.serviceops.modules.notification.service.NotificationService;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Chay {@link DunningServiceImpl} tren JPA THAT (H2) — cac unit test mock repository khong bao gio thuc thi
 * rang buoc UNIQUE(invoice_id, stage, reference_date) cua bang {@code dunning_logs} (V81), von la chot chan
 * cuoi cua QTN-27. Phu TC-01/TC-02 va chot chan gui trung o tang CSDL.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({DunningServiceImpl.class, InvoiceServiceImpl.class, DunningIntegrationTest.ClockConfig.class})
class DunningIntegrationTest {

	@TestConfiguration
	static class ClockConfig {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-09-21T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}
	}

	private static final LocalDate TODAY = LocalDate.of(2026, 9, 21);

	@MockBean private NotificationService notificationService;
	@MockBean private AuditLogService auditLogService;

	@Autowired private TestEntityManager em;
	@Autowired private DunningService service;
	@Autowired private DunningLogRepository dunningLogRepository;

	@Test
	@DisplayName("NCL-10-CN-006-TC-01: hoa don dung han hom nay -> ghi lich su nhac va gui thong bao cho ke toan + chu khach hang")
	void remindsAccountantsAndCustomerOwnerForInvoiceDueToday() {
		User accountant = user("ketoan01");
		roleScope(accountant, "VT-05");
		User owner = user("sale01");
		Customer customer = customer("Cong ty ABC", owner.getId());
		Contract contract = contract(customer);
		invoice(contract, "INV-A", InvoiceStatus.ISSUED, "100.00", TODAY);
		em.flush();

		DunningRunRes res = service.run(new DunningRunReq(TODAY));

		assertThat(res.sent()).hasSize(1);
		assertThat(res.sent().get(0).stage()).isEqualTo("DUE_TODAY");
		assertThat(res.sent().get(0).recipientIds()).containsExactlyInAnyOrder(accountant.getId(), owner.getId());
		verify(notificationService, times(2)).sendInAppNotification(anyLong(), any(), any(), any(), any(), any());
		assertThat(dunningLogRepository.count()).isEqualTo(1);
	}

	@Test
	@DisplayName("NCL-10-CN-006-TC-02: chay lai trong cung ngay khong nhac lai va tang so bo qua")
	void doesNotResendWhenRunTwiceOnTheSameDay() {
		User accountant = user("ketoan02");
		roleScope(accountant, "VT-05");
		Customer customer = customer("Cong ty XYZ", null);
		Contract contract = contract(customer);
		invoice(contract, "INV-B", InvoiceStatus.ISSUED, "100.00", TODAY);
		em.flush();

		service.run(new DunningRunReq(TODAY));
		DunningRunRes second = service.run(new DunningRunReq(TODAY));

		assertThat(second.sent()).isEmpty();
		assertThat(second.skippedAlreadySentCount()).isEqualTo(1);
		assertThat(dunningLogRepository.count()).isEqualTo(1);
	}

	@Test
	void savingADuplicateCycleDirectlyIsRejectedByTheDatabaseConstraint() {
		Customer customer = customer("Cong ty ABC", null);
		Contract contract = contract(customer);
		Invoice invoice = invoice(contract, "INV-C", InvoiceStatus.ISSUED, "100.00", TODAY);
		DunningLog first = dunningLogRepository.saveAndFlush(dunningLog(invoice.getId(), DunningStage.DUE_TODAY, TODAY));

		DunningLog duplicate = dunningLog(invoice.getId(), DunningStage.DUE_TODAY, TODAY);
		assertThatThrownBy(() -> dunningLogRepository.saveAndFlush(duplicate))
				.isInstanceOf(DataIntegrityViolationException.class);
		assertThat(first.getId()).isNotNull();
	}

	// ---------- du lieu ----------

	private User user(String username) {
		User u = new User();
		u.setUsername(username);
		u.setPasswordHash("x");
		u.setFullName(username);
		em.persist(u);
		return u;
	}

	private void roleScope(User user, String roleCode) {
		Role role = new Role();
		role.setCode(roleCode);
		role.setName(roleCode);
		em.persist(role);
		UserRoleScope scope = new UserRoleScope();
		scope.setUser(user);
		scope.setRole(role);
		scope.setScopeType("COMPANY");
		em.persist(scope);
	}

	private Customer customer(String name, Long ownerId) {
		Customer customer = new Customer();
		customer.setCode("KHD" + System.nanoTime());
		customer.setName(name);
		customer.setOwnerId(ownerId);
		customer.setCreatedAt(LocalDateTime.of(2026, 1, 1, 8, 0));
		em.persist(customer);
		return customer;
	}

	private Contract contract(Customer customer) {
		Contract contract = new Contract();
		contract.setContractCode("HDD" + System.nanoTime());
		contract.setName("Hop dong");
		contract.setCustomerId(customer.getId());
		contract.setContractType(ContractType.TIME_AND_MATERIAL);
		contract.setTotalValue(new BigDecimal("1000000000.00"));
		contract.setCreatedAt(LocalDateTime.of(2026, 1, 1, 8, 0));
		em.persist(contract);
		return contract;
	}

	private Invoice invoice(Contract contract, String code, InvoiceStatus status, String total, LocalDate dueDate) {
		LocalDateTime now = LocalDateTime.of(2026, 1, 1, 8, 0);
		Invoice invoice = new Invoice();
		invoice.setInvoiceCode(code + "-" + System.nanoTime());
		invoice.setContractId(contract.getId());
		invoice.setCustomerId(contract.getCustomerId());
		invoice.setStatus(status);
		invoice.setTotalAmount(new BigDecimal(total));
		invoice.setInvoiceDate(dueDate.minusDays(30));
		invoice.setDueDate(dueDate);
		invoice.setCreatedAt(now);
		invoice.setUpdatedAt(now);
		em.persist(invoice);
		return invoice;
	}

	private DunningLog dunningLog(Long invoiceId, DunningStage stage, LocalDate referenceDate) {
		DunningLog log = new DunningLog();
		log.setInvoiceId(invoiceId);
		log.setStage(stage);
		log.setReferenceDate(referenceDate);
		log.setRemainingAmount(new BigDecimal("100.00"));
		log.setRecipientIds("1");
		log.setSentAt(LocalDateTime.of(2026, 9, 21, 7, 0));
		return log;
	}
}
