package com.serviceops.modules.portal;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.entity.AcceptanceItem;
import com.serviceops.modules.acceptance.entity.Deliverable;
import com.serviceops.modules.acceptance.entity.DeliverableVersion;
import com.serviceops.modules.acceptance.enums.AcceptanceDecisionType;
import com.serviceops.modules.acceptance.enums.AcceptanceItemType;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.enums.ConfirmationChannel;
import com.serviceops.modules.acceptance.enums.DeliverableType;
import com.serviceops.modules.acceptance.mapper.AcceptanceMapper;
import com.serviceops.modules.acceptance.repository.AcceptanceCertificateRepository;
import com.serviceops.modules.acceptance.security.AcceptanceAccessGuard;
import com.serviceops.modules.acceptance.service.impl.AcceptanceConfirmationServiceImpl;
import com.serviceops.modules.acceptance.service.impl.AcceptanceViewAssembler;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.service.impl.ContractMilestoneServiceImpl;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.entity.CustomerContact;
import com.serviceops.modules.customer.enums.ContactRole;
import com.serviceops.modules.customer.enums.CustomerStatus;
import com.serviceops.modules.identity.auth.validator.PasswordPolicyValidator;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.InvoiceLine;
import com.serviceops.modules.invoice.entity.Payment;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.enums.PaymentMethod;
import com.serviceops.modules.invoice.service.impl.MilestoneInvoiceServiceImpl;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import com.serviceops.modules.invoice.validator.MilestoneAcceptanceValidator;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.portal.dto.request.PortalAcceptanceDecisionReq;
import com.serviceops.modules.portal.dto.request.PortalAccountCreateReq;
import com.serviceops.modules.portal.dto.request.PortalAccountStatusReq;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceRes;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceSummaryRes;
import com.serviceops.modules.portal.dto.response.PortalAccountRes;
import com.serviceops.modules.portal.dto.response.PortalContactCandidateRes;
import com.serviceops.modules.portal.dto.response.PortalDebtSummaryRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceDetailRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceRes;
import com.serviceops.modules.portal.dto.response.PortalProjectProgressRes;
import com.serviceops.modules.portal.dto.response.PortalProjectRes;
import com.serviceops.modules.portal.mapper.PortalMapper;
import com.serviceops.modules.portal.repository.PortalAccountRepository;
import com.serviceops.modules.portal.security.PortalDataScopeGuard;
import com.serviceops.modules.portal.service.PortalAcceptanceService;
import com.serviceops.modules.portal.service.PortalAccountService;
import com.serviceops.modules.portal.service.PortalInvoiceService;
import com.serviceops.modules.portal.service.PortalProjectService;
import com.serviceops.modules.portal.service.impl.PortalAcceptanceServiceImpl;
import com.serviceops.modules.portal.service.impl.PortalAccountServiceImpl;
import com.serviceops.modules.portal.service.impl.PortalInvoiceServiceImpl;
import com.serviceops.modules.portal.service.impl.PortalProjectServiceImpl;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.ProjectMilestone;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.MilestoneProgressStatus;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Kiem thu muc du lieu/API (BE-QA) cua Epic NCL-13 tren JPA that (H2): cap/khoa tai khoan cong (CN-001),
 * khach hang xem tien do (CN-002), duyet phieu nghiem thu (CN-003) va xem hoa don/cong no (CN-004) — trong do
 * trong tam la QTN-26: tai khoan cong chi thay du lieu cua chinh khach hang minh. TC "Khong co quyen" o muc
 * vai tro (403 truoc khi vao service) nam o {@code PortalControllerIT}.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({PortalAccountServiceImpl.class, PortalProjectServiceImpl.class, PortalAcceptanceServiceImpl.class,
		PortalInvoiceServiceImpl.class, PortalMapper.class, PortalDataScopeGuard.class, PasswordPolicyValidator.class,
		AcceptanceConfirmationServiceImpl.class, AcceptanceAccessGuard.class, AcceptanceViewAssembler.class,
		AcceptanceMapper.class, ContractMilestoneServiceImpl.class, MilestoneInvoiceServiceImpl.class,
		MilestoneAcceptanceValidator.class, ContractValueLimitValidator.class, PortalIntegrationTest.Config.class})
class PortalIntegrationTest {

	@TestConfiguration
	static class Config {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-09-24T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}

		@Bean
		PasswordEncoder passwordEncoder() {
			return new BCryptPasswordEncoder(4);
		}
	}

	private static final AtomicInteger UNIQUE = new AtomicInteger();
	private static final LocalDate TODAY = LocalDate.of(2026, 9, 24);
	private static final long PM_ID = 30L;
	private static final String INTERNAL_NOTE = "GHI CHU NOI BO KHONG DUOC LO RA CONG";

	@MockBean private AuditLogService auditLogService;
	@MockBean private ContractAuditLogger contractAuditLogger;
	@MockBean private CurrentUserScopeProvider currentUserScopeProvider;
	@MockBean private NotificationService notificationService;

	@Autowired private TestEntityManager em;
	@Autowired private PortalAccountService accountService;
	@Autowired private PortalProjectService projectService;
	@Autowired private PortalAcceptanceService acceptanceService;
	@Autowired private PortalInvoiceService invoiceService;
	@Autowired private PortalDataScopeGuard scopeGuard;
	@Autowired private PortalAccountRepository accountRepository;
	@Autowired private UserRepository userRepository;
	@Autowired private UserRoleScopeRepository userRoleScopeRepository;
	@Autowired private AcceptanceCertificateRepository certificateRepository;
	@Autowired private ContractMilestoneRepository contractMilestoneRepository;

	private Customer customerA;
	private Customer customerB;
	private CustomerContact contactA;
	private Contract contractA;
	private Contract contractB;
	private Project projectA;
	private Project projectB;

	@BeforeEach
	void setUp() {
		Role portalRole = new Role();
		portalRole.setCode("VT-09");
		portalRole.setName("Khach hang");
		em.persist(portalRole);

		customerA = customer("Cong ty A", CustomerStatus.ACTIVE, null);
		customerB = customer("Cong ty B", CustomerStatus.ACTIVE, null);
		contactA = contact(customerA, "Nguyen Thi Nhi", "nhi@a.example");
		contractA = contract(customerA);
		contractB = contract(customerB);
		projectA = project(contractA);
		projectB = project(contractB);
		actAsAdmin();
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	// ============================================================ NCL-13-CN-001

	@Test
	@DisplayName("NCL-13-CN-001-TC-01: cap tai khoan cong -> tai khoan VT-09 pham vi SELF, chi gan voi khach hang cua nguoi lien he")
	void grantPortalAccount() {
		PortalAccountRes account = accountService.create(new PortalAccountCreateReq(contactA.getId(), "nhi.a", "Matkhau123"));

		assertThat(account.customerId()).isEqualTo(customerA.getId());
		assertThat(account.contactId()).isEqualTo(contactA.getId());
		assertThat(account.status()).isEqualTo(UserStatus.ACTIVE);
		assertThat(account.fullName()).isEqualTo("Nguyen Thi Nhi");
		assertThat(account.email()).isEqualTo("nhi@a.example");
		User user = userRepository.findById(account.userId()).orElseThrow();
		assertThat(user.getDepartmentId()).isNull();
		assertThat(userRoleScopeRepository.findRoleCodesByUserId(user.getId())).containsExactly("VT-09");
		assertThat(userRoleScopeRepository.findByUser_Id(user.getId()).get(0).getScopeType()).isEqualTo("SELF");

		// Tai khoan vua cap chi thay dung khach hang A.
		actAsPortalUser(user);
		assertThat(scopeGuard.currentScope().customerIds()).containsExactly(customerA.getId());
		// TC-04
		verify(auditLogService).record(eq("Cấp tài khoản cổng khách hàng"), eq(AuditTargetType.PORTAL),
				eq(account.id()), anyString(), contains("Cong ty A"));
	}

	@Test
	@DisplayName("NCL-13-CN-001: chan cap trung nguoi lien he, trung ten dang nhap, mat khau yeu, ho so da gop")
	void grantPortalAccountGuards() {
		accountService.create(new PortalAccountCreateReq(contactA.getId(), "nhi.a", "Matkhau123"));
		assertError(() -> accountService.create(new PortalAccountCreateReq(contactA.getId(), "nhi.b", "Matkhau123")),
				ErrorCode.DUPLICATE_DATA);

		CustomerContact other = contact(customerA, "Tran Van B", null);
		assertError(() -> accountService.create(new PortalAccountCreateReq(other.getId(), "NHI.A", "Matkhau123")),
				ErrorCode.DUPLICATE_DATA);
		assertError(() -> accountService.create(new PortalAccountCreateReq(other.getId(), "tran.b", "chiconchu")),
				ErrorCode.VALIDATION_ERROR);
		assertError(() -> accountService.create(new PortalAccountCreateReq(999_999L, "x.y", "Matkhau123")),
				ErrorCode.RESOURCE_NOT_FOUND);

		Customer merged = customer("Cong ty A (trung)", CustomerStatus.MERGED, customerA.getId());
		CustomerContact mergedContact = contact(merged, "Le C", null);
		assertError(() -> accountService.create(new PortalAccountCreateReq(mergedContact.getId(), "le.c", "Matkhau123")),
				ErrorCode.INVALID_STATE);

		// Email nguoi lien he da la email dang nhap cua tai khoan khac -> khoi phuc mat khau se mo ho.
		CustomerContact sameEmail = contact(customerB, "Pham D", "nhi@a.example");
		assertError(() -> accountService.create(new PortalAccountCreateReq(sameEmail.getId(), "pham.d", "Matkhau123")),
				ErrorCode.DUPLICATE_DATA);
	}

	@Test
	@DisplayName("NCL-13-CN-001-TC-02: khoa tai khoan khi nguoi lien he nghi viec -> khong dang nhap/dung cong duoc, du lieu giu nguyen")
	void lockPortalAccount() {
		PortalAccountRes account = accountService.create(new PortalAccountCreateReq(contactA.getId(), "nhi.a", "Matkhau123"));
		int tokenVersionBefore = userRepository.findById(account.userId()).orElseThrow().getTokenVersion();

		PortalAccountRes locked = accountService.updateStatus(account.id(),
				new PortalAccountStatusReq(UserStatus.LOCKED, "Nguoi lien he da nghi viec"));

		assertThat(locked.status()).isEqualTo(UserStatus.LOCKED);
		assertThat(locked.statusReason()).isEqualTo("Nguoi lien he da nghi viec");
		assertThat(locked.statusChangedBy()).isEqualTo("admin");
		User user = userRepository.findById(account.userId()).orElseThrow();
		assertThat(user.getTokenVersion()).isEqualTo(tokenVersionBefore + 1);
		assertThat(accountRepository.findById(account.id())).isPresent();
		assertThat(locked.customerId()).isEqualTo(customerA.getId());

		actAsPortalUser(user);
		assertThatThrownBy(() -> projectService.listMyProjects()).isInstanceOf(AccessDeniedException.class);

		actAsAdmin();
		assertError(() -> accountService.updateStatus(account.id(), new PortalAccountStatusReq(UserStatus.LOCKED, null)),
				ErrorCode.INVALID_STATE);
		assertError(() -> accountService.updateStatus(account.id(), new PortalAccountStatusReq(UserStatus.INACTIVE, null)),
				ErrorCode.VALIDATION_ERROR);
		assertThat(accountService.updateStatus(account.id(), new PortalAccountStatusReq(UserStatus.ACTIVE, null)).status())
				.isEqualTo(UserStatus.ACTIVE);
		verify(auditLogService).record(eq("Khóa tài khoản cổng khách hàng"), eq(AuditTargetType.PORTAL),
				eq(account.id()), anyString(), contains("nghi viec"));
		verify(auditLogService).record(eq("Mở khóa tài khoản cổng khách hàng"), eq(AuditTargetType.PORTAL),
				eq(account.id()), anyString(), anyString());
	}

	@Test
	@DisplayName("NCL-13-CN-001: tra cuu tai khoan cong theo khach hang va trang thai")
	void searchPortalAccounts() {
		PortalAccountRes first = accountService.create(new PortalAccountCreateReq(contactA.getId(), "nhi.a", "Matkhau123"));
		CustomerContact contactB = contact(customerB, "Vo E", null);
		accountService.create(new PortalAccountCreateReq(contactB.getId(), "vo.e", "Matkhau123"));
		accountService.updateStatus(first.id(), new PortalAccountStatusReq(UserStatus.LOCKED, null));

		assertThat(accountService.search(customerA.getId(), null)).extracting(PortalAccountRes::username)
				.containsExactly("nhi.a");
		assertThat(accountService.search(null, UserStatus.ACTIVE)).extracting(PortalAccountRes::username)
				.containsExactly("vo.e");
		assertThat(accountService.search(null, null)).hasSize(2);
		assertThat(accountService.get(first.id()).customerCode()).isEqualTo(customerA.getCode());

		// Danh sach nguoi lien he de chon cap tai khoan: dau moi chinh truoc, kem tai khoan da cap.
		CustomerContact primary = contact(customerA, "Dau Moi Chinh", null);
		primary.setRole(ContactRole.PRIMARY);
		assertThat(accountService.listCandidates(customerA.getId()))
				.extracting(PortalContactCandidateRes::contactId, PortalContactCandidateRes::portalUsername,
						PortalContactCandidateRes::portalStatus)
				.containsExactly(tuple(primary.getId(), null, null),
						tuple(contactA.getId(), "nhi.a", UserStatus.LOCKED));
		assertError(() -> accountService.listCandidates(999_999L), ErrorCode.RESOURCE_NOT_FOUND);
	}

	// ============================================================ NCL-13-CN-002

	@Test
	@DisplayName("NCL-13-CN-002-TC-01: khach hang chi thay du an cua chinh minh")
	void listOnlyOwnProjects() {
		Project secondA = project(contractA);
		actAsPortalUser(portalUserOf(contactA));

		List<PortalProjectRes> projects = projectService.listMyProjects();

		assertThat(projects).extracting(PortalProjectRes::id).containsExactlyInAnyOrder(projectA.getId(), secondA.getId());
		verify(auditLogService).record(eq("Khách hàng xem danh sách dự án"), eq(AuditTargetType.PORTAL), anyLong(),
				anyString(), anyString());
	}

	@Test
	@DisplayName("NCL-13-CN-002-TC-02: mo du an cua khach hang khac (hoac ma khong ton tai) bang duong dan truc tiep -> tu choi")
	void projectOfOtherCustomerDenied() {
		actAsPortalUser(portalUserOf(contactA));

		assertThatThrownBy(() -> projectService.getProgress(projectB.getId())).isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> projectService.getProgress(987_654L)).isInstanceOf(AccessDeniedException.class);
		verify(auditLogService, never()).record(eq("Khách hàng xem tiến độ dự án"), eq(AuditTargetType.PORTAL),
				anyLong(), anyString(), anyString());
	}

	@Test
	@DisplayName("NCL-13-CN-002-TC-01/03: tien do tong quan (hang muc, moc, san pham ban giao) va khong lo ghi chu noi bo")
	void projectProgressWithoutInternalNotes() {
		WorkPackage parent = workPackage(projectA, null, "Giai doan 1");
		WorkPackage child = workPackage(projectA, parent.getId(), "Thiet ke");
		task(parent, TaskStatus.DONE);
		task(parent, TaskStatus.IN_PROGRESS);
		task(child, TaskStatus.DONE);
		milestone(projectA, "Ban giao GD1", TODAY.minusDays(5), null);
		milestone(projectA, "Kick-off", TODAY.minusDays(30), TODAY.minusDays(29));
		milestone(projectA, "Nghiem thu cuoi", TODAY.plusDays(40), null);
		Deliverable delivered = deliverable(child, "Tai lieu thiet ke");
		version(delivered, "1.0", TODAY.minusDays(10));
		version(delivered, "1.1", TODAY.minusDays(2));
		deliverable(child, "Ban cai dat");
		certificate(projectA, parent, AcceptanceStatus.PENDING_CONFIRMATION, null);

		actAsPortalUser(portalUserOf(contactA));
		PortalProjectProgressRes progress = projectService.getProgress(projectA.getId());

		assertThat(progress.project().totalTasks()).isEqualTo(3);
		assertThat(progress.project().doneTasks()).isEqualTo(2);
		assertThat(progress.project().progressPercent()).isEqualTo(67);
		assertThat(progress.project().lateMilestones()).isEqualTo(1);
		assertThat(progress.project().doneMilestones()).isEqualTo(1);
		assertThat(progress.project().nextMilestoneName()).isEqualTo("Ban giao GD1");

		PortalProjectProgressRes.WorkPackageProgressRes parentProgress = progress.workPackages().stream()
				.filter(pack -> pack.id().equals(parent.getId())).findFirst().orElseThrow();
		assertThat(parentProgress.totalTasks()).isEqualTo(3);
		assertThat(parentProgress.progressPercent()).isEqualTo(67);
		assertThat(parentProgress.acceptanceStatus()).isEqualTo(AcceptanceStatus.PENDING_CONFIRMATION);
		assertThat(progress.workPackages()).filteredOn(pack -> pack.id().equals(child.getId()))
				.singleElement().satisfies(pack -> assertThat(pack.progressPercent()).isEqualTo(100));

		assertThat(progress.milestones()).filteredOn(m -> m.name().equals("Ban giao GD1")).singleElement()
				.satisfies(m -> {
					assertThat(m.status()).isEqualTo(MilestoneProgressStatus.LATE);
					assertThat(m.daysLate()).isEqualTo(5L);
				});
		assertThat(progress.deliverables()).singleElement().satisfies(item -> {
			assertThat(item.name()).isEqualTo("Tai lieu thiet ke");
			assertThat(item.latestVersionNo()).isEqualTo("1.1");
			assertThat(item.versionCount()).isEqualTo(2);
		});

		// TC-03: moi mo ta/ghi chu noi bo (hang muc, cong viec, moc, san pham, phien ban) deu khong co trong ket qua.
		assertThat(progress.toString()).doesNotContain(INTERNAL_NOTE);
		verify(auditLogService).record(eq("Khách hàng xem tiến độ dự án"), eq(AuditTargetType.PORTAL),
				eq(projectA.getId()), anyString(), anyString());
	}

	@Test
	@DisplayName("QTN-26: ho so da gop vao khach hang cua tai khoan van thuoc pham vi (cung phap nhan)")
	void mergedCustomerDataStaysVisible() {
		Customer merged = customer("Cong ty A (ban trung)", CustomerStatus.MERGED, customerA.getId());
		Project legacy = project(contract(merged));
		actAsPortalUser(portalUserOf(contactA));

		assertThat(projectService.listMyProjects()).extracting(PortalProjectRes::id)
				.contains(projectA.getId(), legacy.getId())
				.doesNotContain(projectB.getId());
	}

	// ============================================================ NCL-13-CN-003

	@Test
	@DisplayName("NCL-13-CN-003-TC-01: khach hang xac nhan tren cong -> ACCEPTED kem thoi diem, nguoi xac nhan; mo moc thanh toan (QTN-25)")
	void confirmAcceptanceOnPortal() {
		WorkPackage pack = workPackage(projectA, null, "Giai doan 1");
		ContractMilestone milestone = contractMilestone(contractA, ContractMilestoneStatus.PENDING);
		AcceptanceCertificate certificate = certificate(projectA, pack, AcceptanceStatus.PENDING_CONFIRMATION,
				milestone.getId());
		User portalUser = portalUserOf(contactA);
		actAsPortalUser(portalUser);

		PortalAcceptanceRes result = acceptanceService.confirm(certificate.getId());

		assertThat(result.status()).isEqualTo(AcceptanceStatus.ACCEPTED);
		assertThat(result.confirmationChannel()).isEqualTo(ConfirmationChannel.PORTAL);
		assertThat(result.signerName()).isEqualTo("Nguyen Thi Nhi");
		assertThat(result.signedDate()).isEqualTo(TODAY);
		assertThat(result.confirmedAt()).isNotNull();
		assertThat(result.awaitingDecision()).isFalse();
		assertThat(result.decisions()).singleElement().satisfies(decision -> {
			assertThat(decision.decision()).isEqualTo(AcceptanceDecisionType.ACCEPTED);
			assertThat(decision.channel()).isEqualTo(ConfirmationChannel.PORTAL);
		});
		AcceptanceCertificate saved = certificateRepository.findById(certificate.getId()).orElseThrow();
		assertThat(saved.getConfirmedBy()).isEqualTo(portalUser.getUsername());
		assertThat(contractMilestoneRepository.findById(milestone.getId()).orElseThrow().getStatus())
				.isEqualTo(ContractMilestoneStatus.READY_TO_INVOICE);
		// TC-04 + bao PM
		verify(auditLogService).record(eq("Xác nhận phiếu nghiệm thu"), eq(AuditTargetType.ACCEPTANCE),
				eq(certificate.getId()), anyString(), contains("tren cong khach hang"));
		verify(notificationService).sendInAppNotification(eq(PM_ID), eq(NotificationType.ACCEPTANCE_DECIDED_ON_PORTAL),
				anyString(), anyString(), eq(certificate.getId()), anyString());

		// Phieu da ACCEPTED thi khong xac nhan/tu choi lai duoc.
		assertError(() -> acceptanceService.reject(certificate.getId(), new PortalAcceptanceDecisionReq("sai")),
				ErrorCode.INVALID_STATE);
	}

	@Test
	@DisplayName("NCL-13-CN-003-TC-02: khach hang tu choi kem ly do -> NEEDS_REVISION, luu ly do")
	void rejectAcceptanceOnPortal() {
		WorkPackage pack = workPackage(projectA, null, "Giai doan 1");
		AcceptanceCertificate certificate = certificate(projectA, pack, AcceptanceStatus.PENDING_CONFIRMATION, null);
		actAsPortalUser(portalUserOf(contactA));

		PortalAcceptanceRes result = acceptanceService.reject(certificate.getId(),
				new PortalAcceptanceDecisionReq("  Thieu tai lieu huong dan  "));

		assertThat(result.status()).isEqualTo(AcceptanceStatus.NEEDS_REVISION);
		assertThat(result.lastRejectionReason()).isEqualTo("Thieu tai lieu huong dan");
		assertThat(result.decisions()).singleElement().satisfies(decision -> {
			assertThat(decision.decision()).isEqualTo(AcceptanceDecisionType.REJECTED);
			assertThat(decision.channel()).isEqualTo(ConfirmationChannel.PORTAL);
			assertThat(decision.signerName()).isEqualTo("Nguyen Thi Nhi");
		});
		assertError(() -> acceptanceService.confirm(certificate.getId()), ErrorCode.INVALID_STATE);
		verify(auditLogService).record(eq("Từ chối phiếu nghiệm thu"), eq(AuditTargetType.ACCEPTANCE),
				eq(certificate.getId()), anyString(), contains("Thieu tai lieu huong dan"));
	}

	@Test
	@DisplayName("NCL-13-CN-003-TC-03: phieu cua khach hang khac -> tu choi, trang thai phieu khong doi")
	void acceptanceOfOtherCustomerDenied() {
		WorkPackage pack = workPackage(projectB, null, "Giai doan B");
		AcceptanceCertificate certificate = certificate(projectB, pack, AcceptanceStatus.PENDING_CONFIRMATION, null);
		actAsPortalUser(portalUserOf(contactA));

		assertThatThrownBy(() -> acceptanceService.confirm(certificate.getId())).isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> acceptanceService.get(certificate.getId())).isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> acceptanceService.list(projectB.getId(), null)).isInstanceOf(AccessDeniedException.class);
		assertThat(certificateRepository.findById(certificate.getId()).orElseThrow().getStatus())
				.isEqualTo(AcceptanceStatus.PENDING_CONFIRMATION);
		verify(notificationService, never()).sendInAppNotification(anyLong(), eq(NotificationType.ACCEPTANCE_DECIDED_ON_PORTAL),
				anyString(), anyString(), anyLong(), anyString());
	}

	@Test
	@DisplayName("NCL-13-CN-003: danh sach phieu chi cua khach hang minh, loc theo trang thai; chi tiet co noi dung phieu")
	void listAndReadAcceptances() {
		WorkPackage packA = workPackage(projectA, null, "Giai doan 1");
		WorkPackage packA2 = workPackage(projectA, null, "Giai doan 2");
		AcceptanceCertificate pending = certificate(projectA, packA, AcceptanceStatus.PENDING_CONFIRMATION, null);
		certificate(projectA, packA2, AcceptanceStatus.ACCEPTED, null);
		certificate(projectB, workPackage(projectB, null, "B"), AcceptanceStatus.PENDING_CONFIRMATION, null);
		item(pending, AcceptanceItemType.TASK, "Phan tich yeu cau", null);
		item(pending, AcceptanceItemType.DELIVERABLE, "Tai lieu", "1.1");
		actAsPortalUser(portalUserOf(contactA));

		assertThat(acceptanceService.list(null, null)).hasSize(2)
				.allSatisfy(summary -> assertThat(summary.projectId()).isEqualTo(projectA.getId()));
		assertThat(acceptanceService.list(null, AcceptanceStatus.PENDING_CONFIRMATION))
				.extracting(PortalAcceptanceSummaryRes::id).containsExactly(pending.getId());

		PortalAcceptanceRes detail = acceptanceService.get(pending.getId());
		assertThat(detail.awaitingDecision()).isTrue();
		assertThat(detail.tasks()).containsExactly("Phan tich yeu cau");
		assertThat(detail.deliverables()).singleElement()
				.satisfies(item -> assertThat(item.versionNo()).isEqualTo("1.1"));
	}

	// ============================================================ NCL-13-CN-004

	@Test
	@DisplayName("NCL-13-CN-004-TC-01: hoa don cua khach hang kem so con phai tra va han thanh toan; an hoa don nhap")
	void listOwnInvoices() {
		Invoice partial = invoice(customerA, contractA, InvoiceStatus.PARTIALLY_PAID, "100000000", TODAY.minusDays(10));
		payment(partial, "60000000");
		invoiceLine(partial, "Dot 1", "100000000");
		Invoice issued = invoice(customerA, contractA, InvoiceStatus.ISSUED, "50000000", TODAY.plusDays(20));
		Invoice paid = invoice(customerA, contractA, InvoiceStatus.PAID, "30000000", TODAY.minusDays(40));
		payment(paid, "30000000");
		invoice(customerA, contractA, InvoiceStatus.DRAFT, "70000000", TODAY.plusDays(30));
		invoice(customerB, contractB, InvoiceStatus.ISSUED, "999000000", TODAY.plusDays(5));
		actAsPortalUser(portalUserOf(contactA));

		List<PortalInvoiceRes> invoices = invoiceService.list(null, null);

		assertThat(invoices).extracting(PortalInvoiceRes::id)
				.containsExactlyInAnyOrder(partial.getId(), issued.getId(), paid.getId());
		PortalInvoiceRes partialRes = invoices.stream().filter(i -> i.id().equals(partial.getId())).findFirst().orElseThrow();
		assertThat(partialRes.remainingAmount()).isEqualByComparingTo("40000000");
		assertThat(partialRes.paidAmount()).isEqualByComparingTo("60000000");
		assertThat(partialRes.dueDate()).isEqualTo(TODAY.minusDays(10));
		assertThat(partialRes.overdue()).isTrue();
		assertThat(partialRes.daysOverdue()).isEqualTo(10);
		assertThat(invoices.stream().filter(i -> i.id().equals(paid.getId())).findFirst().orElseThrow().overdue()).isFalse();
		assertThat(invoiceService.list(null, true)).extracting(PortalInvoiceRes::id).containsExactly(partial.getId());
		assertThat(invoiceService.list(InvoiceStatus.ISSUED, null)).extracting(PortalInvoiceRes::id)
				.containsExactly(issued.getId());
		assertError(() -> invoiceService.list(InvoiceStatus.DRAFT, null), ErrorCode.VALIDATION_ERROR);

		PortalDebtSummaryRes summary = invoiceService.summary();
		assertThat(summary.invoiceCount()).isEqualTo(3);
		assertThat(summary.totalInvoiced()).isEqualByComparingTo("180000000");
		assertThat(summary.totalPaid()).isEqualByComparingTo("90000000");
		assertThat(summary.totalOutstanding()).isEqualByComparingTo("90000000");
		assertThat(summary.overdueInvoiceCount()).isEqualTo(1);
		assertThat(summary.totalOverdue()).isEqualByComparingTo("40000000");
		assertThat(summary.nextDueDate()).isEqualTo(TODAY.plusDays(20));
		assertThat(summary.nextDueAmount()).isEqualByComparingTo("50000000");

		PortalInvoiceDetailRes detail = invoiceService.get(partial.getId());
		assertThat(detail.lines()).singleElement().satisfies(line -> assertThat(line.description()).isEqualTo("Dot 1"));
		assertThat(detail.payments()).singleElement()
				.satisfies(p -> assertThat(p.amount()).isEqualByComparingTo("60000000"));
		assertThat(detail.toString()).doesNotContain(INTERNAL_NOTE);
		verify(auditLogService).record(eq("Khách hàng xem hóa đơn và công nợ"), eq(AuditTargetType.PORTAL),
				eq(partial.getId()), eq("Hóa đơn " + partial.getInvoiceCode()), contains(partial.getInvoiceCode()));
	}

	@Test
	@DisplayName("NCL-13-CN-004-TC-02: mo hoa don cua khach hang khac (hoac hoa don nhap) -> tu choi")
	void invoiceOfOtherCustomerDenied() {
		Invoice otherCustomer = invoice(customerB, contractB, InvoiceStatus.ISSUED, "10000000", TODAY.plusDays(5));
		Invoice ownDraft = invoice(customerA, contractA, InvoiceStatus.DRAFT, "10000000", TODAY.plusDays(5));
		actAsPortalUser(portalUserOf(contactA));

		assertThatThrownBy(() -> invoiceService.get(otherCustomer.getId())).isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> invoiceService.get(ownDraft.getId())).isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> invoiceService.get(123_456L)).isInstanceOf(AccessDeniedException.class);
	}

	@Test
	@DisplayName("QTN-26: tai khoan VT-09 chua gan khach hang nao -> khong xem duoc gi tren cong")
	void portalUserWithoutAccountDenied() {
		User stray = new User();
		stray.setUsername("khach.le");
		stray.setPasswordHash("x");
		stray.setFullName("Khach le");
		em.persist(stray);
		actAsPortalUser(stray);

		assertThatThrownBy(() -> invoiceService.list(null, null)).isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> acceptanceService.list(null, null)).isInstanceOf(AccessDeniedException.class);
	}

	// ---------------------------------------------------------------- helpers

	private User portalUserOf(CustomerContact contact) {
		actAsAdmin();
		PortalAccountRes account = accountService.create(new PortalAccountCreateReq(contact.getId(),
				"kh" + UNIQUE.incrementAndGet(), "Matkhau123"));
		return userRepository.findById(account.userId()).orElseThrow();
	}

	private void actAsAdmin() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(1L);
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin", "x",
				List.of(new SimpleGrantedAuthority("ROLE_VT-07"))));
	}

	private void actAsPortalUser(User user) {
		when(currentUserScopeProvider.currentUserId()).thenReturn(user.getId());
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user.getUsername(),
				"x", List.of(new SimpleGrantedAuthority("ROLE_VT-09"))));
	}

	private void assertError(Runnable action, ErrorCode expected) {
		assertThatThrownBy(action::run).isInstanceOfSatisfying(BusinessRuleException.class,
				ex -> assertThat(ex.getErrorCode()).isEqualTo(expected));
	}

	private Customer customer(String name, CustomerStatus status, Long mergedIntoId) {
		Customer value = new Customer();
		value.setCode("KH" + UNIQUE.incrementAndGet());
		value.setName(name);
		value.setStatus(status);
		value.setMergedIntoId(mergedIntoId);
		value.setCreatedAt(LocalDateTime.of(2026, 1, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private CustomerContact contact(Customer owner, String fullName, String email) {
		CustomerContact value = new CustomerContact();
		value.setCustomerId(owner.getId());
		value.setFullName(fullName);
		value.setEmail(email);
		value.setRole(ContactRole.SECONDARY);
		value.setCreatedAt(LocalDateTime.of(2026, 1, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private Contract contract(Customer owner) {
		int n = UNIQUE.incrementAndGet();
		Contract value = new Contract();
		value.setContractCode("HDCKH" + n);
		value.setName("Hop dong " + n);
		value.setCustomerId(owner.getId());
		value.setContractType(ContractType.FIXED_PRICE);
		value.setTotalValue(new BigDecimal("1000000000"));
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private Project project(Contract owner) {
		int n = UNIQUE.incrementAndGet();
		Project value = new Project();
		value.setProjectCode("DA-CKH-" + n);
		value.setName("Du an " + n);
		value.setContractId(owner.getId());
		value.setCustomerId(owner.getCustomerId());
		value.setProjectType("FIXED_PRICE");
		value.setStartDate(LocalDate.of(2026, 9, 1));
		value.setExpectedEndDate(LocalDate.of(2026, 12, 31));
		value.setProjectManagerId(PM_ID);
		value.setStatus(ProjectStatus.RUNNING);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private WorkPackage workPackage(Project owner, Long parentId, String name) {
		WorkPackage value = new WorkPackage();
		value.setProjectId(owner.getId());
		value.setParentId(parentId);
		value.setName(name);
		value.setDescription(INTERNAL_NOTE);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private void task(WorkPackage pack, TaskStatus status) {
		Task value = new Task();
		value.setProjectId(pack.getProjectId());
		value.setWorkPackageId(pack.getId());
		value.setName("Cong viec " + UNIQUE.incrementAndGet());
		value.setDescription(INTERNAL_NOTE);
		value.setStatus(status);
		value.setBudgetHours(new BigDecimal("40"));
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
	}

	private void milestone(Project owner, String name, LocalDate planned, LocalDate actual) {
		ProjectMilestone value = new ProjectMilestone();
		value.setProjectId(owner.getId());
		value.setName(name);
		value.setDescription(INTERNAL_NOTE);
		value.setPlannedDate(planned);
		value.setActualDate(actual);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		value.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
	}

	private Deliverable deliverable(WorkPackage pack, String name) {
		Deliverable value = new Deliverable();
		value.setProjectId(pack.getProjectId());
		value.setWorkPackageId(pack.getId());
		value.setName(name);
		value.setDeliverableType(DeliverableType.DOCUMENT);
		value.setDescription(INTERNAL_NOTE);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		value.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private void version(Deliverable deliverable, String versionNo, LocalDate deliveredDate) {
		DeliverableVersion value = new DeliverableVersion();
		value.setDeliverableId(deliverable.getId());
		value.setVersionNo(versionNo);
		value.setDeliveredDate(deliveredDate);
		value.setReceiverName("Le Van C");
		value.setFileUrl("/files/" + versionNo);
		value.setNote(INTERNAL_NOTE);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
	}

	private AcceptanceCertificate certificate(Project owner, WorkPackage pack, AcceptanceStatus status,
			Long contractMilestoneId) {
		AcceptanceCertificate value = new AcceptanceCertificate();
		value.setCertificateCode("NT-" + UNIQUE.incrementAndGet());
		value.setProjectId(owner.getId());
		value.setWorkPackageId(pack.getId());
		value.setTitle("Nghiem thu " + pack.getName());
		value.setAcceptedValue(new BigDecimal("300000000"));
		value.setStatus(status);
		value.setContractMilestoneId(contractMilestoneId);
		value.setCreatedBy("pm01");
		value.setCreatedAt(LocalDateTime.of(2026, 9, 20, 8, 0));
		value.setUpdatedAt(LocalDateTime.of(2026, 9, 20, 8, 0));
		em.persist(value);
		em.flush();
		return value;
	}

	private void item(AcceptanceCertificate certificate, AcceptanceItemType type, String name, String versionNo) {
		AcceptanceItem value = new AcceptanceItem();
		value.setCertificateId(certificate.getId());
		value.setItemType(type);
		value.setItemName(name);
		value.setVersionNo(versionNo);
		em.persist(value);
	}

	private ContractMilestone contractMilestone(Contract owner, ContractMilestoneStatus status) {
		ContractMilestone value = new ContractMilestone();
		value.setContractId(owner.getId());
		value.setName("Dot 1");
		value.setAmount(new BigDecimal("300000000"));
		value.setStatus(status);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		value.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		em.flush();
		return value;
	}

	private Invoice invoice(Customer owner, Contract contract, InvoiceStatus status, String total, LocalDate dueDate) {
		Invoice value = new Invoice();
		value.setInvoiceCode("INV-" + UNIQUE.incrementAndGet());
		value.setContractId(contract.getId());
		value.setCustomerId(owner.getId());
		value.setStatus(status);
		value.setTotalAmount(new BigDecimal(total));
		value.setInvoiceDate(dueDate.minusDays(30));
		value.setDueDate(dueDate);
		value.setNote(INTERNAL_NOTE);
		value.setCreatedBy("ketoan01");
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		value.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private void invoiceLine(Invoice invoice, String description, String amount) {
		InvoiceLine value = new InvoiceLine();
		value.setInvoiceId(invoice.getId());
		value.setDescription(description);
		value.setAmount(new BigDecimal(amount));
		em.persist(value);
	}

	private void payment(Invoice invoice, String amount) {
		Payment value = new Payment();
		value.setInvoiceId(invoice.getId());
		value.setAmount(new BigDecimal(amount));
		value.setPaymentDate(TODAY.minusDays(1));
		value.setMethod(PaymentMethod.BANK_TRANSFER);
		value.setNote(INTERNAL_NOTE);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		em.flush();
	}
}
