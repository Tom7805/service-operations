package com.serviceops.modules.acceptance;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.acceptance.dto.request.AcceptanceConfirmReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceCreateReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceMilestoneLinkReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceRejectReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceUpdateReq;
import com.serviceops.modules.acceptance.dto.request.DeliverableCreateReq;
import com.serviceops.modules.acceptance.dto.request.DeliverableVersionReq;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceReadinessRes;
import com.serviceops.modules.acceptance.dto.response.DeliverableRes;
import com.serviceops.modules.acceptance.dto.response.MilestoneAcceptanceRes;
import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.enums.AcceptanceDecisionType;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.enums.DeliverableType;
import com.serviceops.modules.acceptance.mapper.AcceptanceMapper;
import com.serviceops.modules.acceptance.mapper.DeliverableMapper;
import com.serviceops.modules.acceptance.repository.AcceptanceCertificateRepository;
import com.serviceops.modules.acceptance.security.AcceptanceAccessGuard;
import com.serviceops.modules.acceptance.service.AcceptanceCertificateService;
import com.serviceops.modules.acceptance.service.AcceptanceConfirmationService;
import com.serviceops.modules.acceptance.service.AcceptanceMilestoneLinkService;
import com.serviceops.modules.acceptance.service.DeliverableService;
import com.serviceops.modules.acceptance.service.impl.AcceptanceCertificateServiceImpl;
import com.serviceops.modules.acceptance.service.impl.AcceptanceConfirmationServiceImpl;
import com.serviceops.modules.acceptance.service.impl.AcceptanceMilestoneLinkServiceImpl;
import com.serviceops.modules.acceptance.service.impl.AcceptanceViewAssembler;
import com.serviceops.modules.acceptance.service.impl.DeliverableServiceImpl;
import com.serviceops.modules.acceptance.validator.DeliverableVersionUniqueValidator;
import com.serviceops.modules.acceptance.validator.WorkPackageCompletionValidator;
import com.serviceops.modules.contract.dto.request.ContractMilestoneReq;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.service.ContractMilestoneService;
import com.serviceops.modules.contract.service.impl.ContractMilestoneServiceImpl;
import com.serviceops.modules.invoice.service.MilestoneInvoiceService;
import com.serviceops.modules.invoice.service.impl.MilestoneInvoiceServiceImpl;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import com.serviceops.modules.invoice.validator.MilestoneAcceptanceValidator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Kiem thu muc du lieu/API (BE-QA) cua Epic NCL-12 tren JPA that (H2): luong phieu nghiem thu tu lap
 * (CN-001), khach hang xac nhan/tu choi (CN-002), gan moc thanh toan va chan lap hoa don (CN-003, QTN-25)
 * toi san pham ban giao va phien ban (CN-004). TC-03 (403 theo vai tro) nam o {@code AcceptanceControllerIT};
 * o day kiem pham vi du an (dung vai tro nhung khong phai PM cua du an).
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({AcceptanceCertificateServiceImpl.class, AcceptanceConfirmationServiceImpl.class,
		AcceptanceMilestoneLinkServiceImpl.class, DeliverableServiceImpl.class, AcceptanceViewAssembler.class,
		AcceptanceMapper.class, DeliverableMapper.class, AcceptanceAccessGuard.class,
		WorkPackageCompletionValidator.class, DeliverableVersionUniqueValidator.class,
		ContractMilestoneServiceImpl.class, MilestoneInvoiceServiceImpl.class, MilestoneAcceptanceValidator.class,
		ContractValueLimitValidator.class, AcceptanceIntegrationTest.ClockConfig.class})
class AcceptanceIntegrationTest {

	@TestConfiguration
	static class ClockConfig {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-09-24T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}
	}

	private static final long PM_ID = 30L;
	private static final long OTHER_PM_ID = 31L;
	private static final AtomicInteger UNIQUE = new AtomicInteger();
	private static final LocalDate TODAY = LocalDate.of(2026, 9, 24);

	@MockBean private AuditLogService auditLogService;
	@MockBean private ContractAuditLogger contractAuditLogger;
	@MockBean private CurrentUserScopeProvider currentUserScopeProvider;

	@Autowired private TestEntityManager em;
	@Autowired private AcceptanceCertificateService certificateService;
	@Autowired private AcceptanceConfirmationService confirmationService;
	@Autowired private AcceptanceMilestoneLinkService linkService;
	@Autowired private DeliverableService deliverableService;
	@Autowired private ContractMilestoneService contractMilestoneService;
	@Autowired private MilestoneInvoiceService milestoneInvoiceService;
	@Autowired private AcceptanceCertificateRepository certificateRepository;

	private Contract contract;
	private Project project;
	private WorkPackage workPackage;

	@BeforeEach
	void setUp() {
		contract = contract();
		project = project(contract, PM_ID, ProjectStatus.RUNNING);
		workPackage = workPackage(project, null, "Giai doan 1");
		actAsProjectManager(PM_ID);
	}

	@AfterEach
	void clearSecurity() {
		SecurityContextHolder.clearContext();
	}

	// ---------------------------------------------------------------- NCL-12-CN-001

	@Test
	@DisplayName("NCL-12-CN-001-TC-01: moi cong viec (ke ca hang muc con) da xong -> phieu cho xac nhan, du cong viec va san pham ban giao")
	void createsCertificateWithTasksOfWholeSubtreeAndLatestDeliverableVersion() {
		WorkPackage child = workPackage(project, workPackage.getId(), "Phan he con");
		task(workPackage, "Phan tich yeu cau", TaskStatus.DONE);
		task(child, "Lap trinh phan he", TaskStatus.DONE);
		DeliverableRes doc = deliverableService.create(project.getId(),
				new DeliverableCreateReq(workPackage.getId(), "Tai lieu thiet ke", DeliverableType.DOCUMENT, null));
		deliverableService.addVersion(doc.id(), version("1.0", TODAY.minusDays(5)));
		deliverableService.addVersion(doc.id(), version("1.1", TODAY.minusDays(1)));
		deliverableService.create(project.getId(),
				new DeliverableCreateReq(workPackage.getId(), "Chua ban giao", DeliverableType.OTHER, null));

		AcceptanceDetailRes res = certificateService.create(project.getId(),
				new AcceptanceCreateReq(workPackage.getId(), null, new BigDecimal("300000000"), "  Dot 1 "));

		assertThat(res.status()).isEqualTo(AcceptanceStatus.PENDING_CONFIRMATION);
		assertThat(res.certificateCode()).startsWith("NT-20260924-");
		assertThat(res.title()).isEqualTo("Nghiem thu hang muc Giai doan 1");
		assertThat(res.note()).isEqualTo("Dot 1");
		assertThat(res.acceptedValue()).isEqualByComparingTo("300000000.00");
		assertThat(res.tasks()).extracting(AcceptanceDetailRes.TaskItemRes::taskName)
				.containsExactly("Phan tich yeu cau", "Lap trinh phan he");
		assertThat(res.deliverables()).singleElement().satisfies(item -> {
			assertThat(item.deliverableName()).isEqualTo("Tai lieu thiet ke");
			assertThat(item.versionNo()).isEqualTo("1.1");
		});
		verify(auditLogService).record(eq("Lập phiếu nghiệm thu hạng mục"), eq(AuditTargetType.ACCEPTANCE),
				eq(res.id()), anyString(), anyString());
	}

	@Test
	@DisplayName("NCL-12-CN-001-TC-02: hang muc con cong viec dang lam -> chan, liet ke cong viec dang do, khong tao phieu")
	void blocksWhenTasksUnfinishedAndListsThem() {
		task(workPackage, "Da xong", TaskStatus.DONE);
		task(workPackage, "Kiem thu", TaskStatus.IN_PROGRESS);
		task(workPackage, "Trien khai", TaskStatus.TODO);

		assertThatThrownBy(() -> certificateService.create(project.getId(),
				new AcceptanceCreateReq(workPackage.getId(), null, BigDecimal.TEN, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE);
					assertThat(ex.getMessage()).contains("con 2 cong viec", "Kiem thu", "Trien khai");
				});
		assertThat(certificateRepository.count()).isZero();

		AcceptanceReadinessRes readiness = certificateService.getReadiness(project.getId(), workPackage.getId());
		assertThat(readiness.ready()).isFalse();
		assertThat(readiness.totalTasks()).isEqualTo(3);
		assertThat(readiness.unfinishedTasks()).extracting(AcceptanceReadinessRes.UnfinishedTaskRes::taskName)
				.containsExactly("Kiem thu", "Trien khai");
	}

	@Test
	@DisplayName("NCL-12-CN-001: hang muc chua co cong viec nao -> chan")
	void blocksEmptyWorkPackage() {
		assertThatThrownBy(() -> certificateService.create(project.getId(),
				new AcceptanceCreateReq(workPackage.getId(), null, BigDecimal.TEN, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
	}

	@Test
	@DisplayName("NCL-12-CN-001-TC-03 (QTN-01): PM khong phu trach du an -> tu choi truy cap")
	void deniesProjectManagerOfAnotherProject() {
		task(workPackage, "Xong", TaskStatus.DONE);
		actAsProjectManager(OTHER_PM_ID);

		assertThatThrownBy(() -> certificateService.create(project.getId(),
				new AcceptanceCreateReq(workPackage.getId(), null, BigDecimal.TEN, null)))
				.isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> certificateService.listByProject(project.getId()))
				.isInstanceOf(AccessDeniedException.class);
		assertThat(certificateService.search(null, null, null)).isEmpty();
	}

	@Test
	@DisplayName("NCL-12-CN-001: hang muc (hoac hang muc cha) da co phieu -> khong lap them phieu trung")
	void blocksDuplicateCertificateInSameBranch() {
		WorkPackage child = workPackage(project, workPackage.getId(), "Con");
		task(child, "Xong", TaskStatus.DONE);
		createCertificate(workPackage);

		assertThatThrownBy(() -> certificateService.create(project.getId(),
				new AcceptanceCreateReq(workPackage.getId(), null, BigDecimal.TEN, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_DATA));
		assertThatThrownBy(() -> certificateService.create(project.getId(),
				new AcceptanceCreateReq(child.getId(), null, BigDecimal.TEN, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_DATA));
	}

	@Test
	@DisplayName("NCL-12-CN-001: du an da dong -> khong lap phieu")
	void blocksClosedProject() {
		Project closed = project(contract, PM_ID, ProjectStatus.CLOSED);
		WorkPackage pack = workPackage(closed, null, "Hang muc");
		task(pack, "Xong", TaskStatus.DONE);

		assertThatThrownBy(() -> certificateService.create(closed.getId(),
				new AcceptanceCreateReq(pack.getId(), null, BigDecimal.TEN, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
	}

	// ---------------------------------------------------------------- NCL-12-CN-002

	@Test
	@DisplayName("NCL-12-CN-002-TC-01: khach hang xac nhan -> phieu ACCEPTED, khoa noi dung, moc thanh toan da gan duoc mo")
	void confirmationAcceptsLocksAndOpensLinkedMilestone() {
		AcceptanceDetailRes created = createCertificate(workPackage);
		ContractMilestone milestone = milestone(contract, "Dot 1", "300000000", ContractMilestoneStatus.PENDING);
		actAsAccountant();
		linkService.link(created.id(), new AcceptanceMilestoneLinkReq(milestone.getId()));
		actAsProjectManager(PM_ID);

		AcceptanceDetailRes res = confirmationService.confirm(created.id(),
				new AcceptanceConfirmReq(" Nguyen Van A ", TODAY, "/files/bien-ban-1.pdf"));

		assertThat(res.status()).isEqualTo(AcceptanceStatus.ACCEPTED);
		assertThat(res.signerName()).isEqualTo("Nguyen Van A");
		assertThat(res.confirmedBy()).isEqualTo("pm");
		assertThat(res.decisions()).singleElement()
				.satisfies(d -> assertThat(d.decision()).isEqualTo(AcceptanceDecisionType.ACCEPTED));
		assertThat(res.paymentMilestone().status()).isEqualTo(ContractMilestoneStatus.READY_TO_INVOICE);
		verify(auditLogService).record(eq("Xác nhận phiếu nghiệm thu"), eq(AuditTargetType.ACCEPTANCE),
				eq(created.id()), anyString(), anyString());

		// Phieu da ky thi khong ghi nhan lai, khong sua duoc noi dung.
		assertThatThrownBy(() -> confirmationService.reject(created.id(), new AcceptanceRejectReq("x", null, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
		assertThatThrownBy(() -> certificateService.resubmit(created.id(),
				new AcceptanceUpdateReq(null, BigDecimal.ONE, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
	}

	@Test
	@DisplayName("NCL-12-CN-002-TC-02: khach hang tu choi kem ly do -> can chinh sua, luu ly do; nop lai -> cho xac nhan lan 2")
	void rejectionRequiresRevisionAndKeepsReason() {
		AcceptanceDetailRes created = createCertificate(workPackage);

		AcceptanceDetailRes rejected = confirmationService.reject(created.id(),
				new AcceptanceRejectReq("Thieu tai lieu huong dan", "Tran B", null));
		assertThat(rejected.status()).isEqualTo(AcceptanceStatus.NEEDS_REVISION);
		assertThat(rejected.lastRejectionReason()).isEqualTo("Thieu tai lieu huong dan");
		verify(auditLogService).record(eq("Từ chối phiếu nghiệm thu"), eq(AuditTargetType.ACCEPTANCE),
				eq(created.id()), anyString(), anyString());

		// Dang can chinh sua thi chua ghi nhan xac nhan duoc.
		assertThatThrownBy(() -> confirmationService.confirm(created.id(),
				new AcceptanceConfirmReq("A", TODAY, "/f.pdf")))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));

		AcceptanceDetailRes resubmitted = certificateService.resubmit(created.id(),
				new AcceptanceUpdateReq("Nghiem thu GD1 (bo sung)", new BigDecimal("250000000"), null));
		assertThat(resubmitted.status()).isEqualTo(AcceptanceStatus.PENDING_CONFIRMATION);
		assertThat(resubmitted.revisionNo()).isEqualTo(2);
		assertThat(resubmitted.lastRejectionReason()).isNull();
		assertThat(resubmitted.decisions()).singleElement().satisfies(d -> {
			assertThat(d.decision()).isEqualTo(AcceptanceDecisionType.REJECTED);
			assertThat(d.reason()).isEqualTo("Thieu tai lieu huong dan");
			assertThat(d.revisionNo()).isEqualTo(1);
		});
	}

	@Test
	@DisplayName("NCL-12-CN-002: ngay ky o tuong lai -> du lieu khong hop le")
	void rejectsFutureSignedDate() {
		AcceptanceDetailRes created = createCertificate(workPackage);
		assertThatThrownBy(() -> confirmationService.confirm(created.id(),
				new AcceptanceConfirmReq("A", TODAY.plusDays(1), "/f.pdf")))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
	}

	@Test
	@DisplayName("NCL-12-CN-002-TC-03 (QTN-01): PM khac du an khong ghi nhan xac nhan duoc")
	void deniesConfirmationByAnotherProjectManager() {
		AcceptanceDetailRes created = createCertificate(workPackage);
		actAsProjectManager(OTHER_PM_ID);
		assertThatThrownBy(() -> confirmationService.confirm(created.id(),
				new AcceptanceConfirmReq("A", TODAY, "/f.pdf")))
				.isInstanceOf(AccessDeniedException.class);
	}

	// ---------------------------------------------------------------- NCL-12-CN-003

	@Test
	@DisplayName("NCL-12-CN-003-TC-01: gan phieu da xac nhan vao moc -> moc du dieu kien va lap duoc hoa don")
	void linkingAcceptedCertificateOpensMilestoneAndAllowsInvoice() {
		AcceptanceDetailRes created = createCertificate(workPackage);
		confirmationService.confirm(created.id(), new AcceptanceConfirmReq("A", TODAY, "/f.pdf"));
		ContractMilestone milestone = milestone(contract, "Dot 1", "300000000", ContractMilestoneStatus.PENDING);
		actAsAccountant();

		AcceptanceDetailRes linked = linkService.link(created.id(), new AcceptanceMilestoneLinkReq(milestone.getId()));

		assertThat(linked.paymentMilestone().status()).isEqualTo(ContractMilestoneStatus.READY_TO_INVOICE);
		assertThat(linked.linkedBy()).isEqualTo("ketoan");
		assertThat(milestoneInvoiceService.createFromMilestone(contract.getId(), milestone.getId(), null).status())
				.isEqualTo("ISSUED");
		verify(auditLogService).record(eq("Gắn phiếu nghiệm thu với mốc thanh toán"),
				eq(AuditTargetType.ACCEPTANCE), eq(created.id()), anyString(), anyString());

		List<MilestoneAcceptanceRes> view = linkService.listForContract(contract.getId());
		assertThat(view).singleElement().satisfies(row -> {
			assertThat(row.certificateCode()).isEqualTo(created.certificateCode());
			assertThat(row.milestoneStatus()).isEqualTo(ContractMilestoneStatus.INVOICED);
		});
	}

	@Test
	@DisplayName("NCL-12-CN-003-TC-02: phieu con cho xac nhan -> moc giu cho nghiem thu, chan lap hoa don va chan mo tay")
	void pendingCertificateKeepsMilestoneClosed() {
		AcceptanceDetailRes created = createCertificate(workPackage);
		// Moc da duoc mo tay truoc khi gan phieu (luong cu cua NCL-04-CN-003).
		ContractMilestone milestone = milestone(contract, "Dot 1", "300000000",
				ContractMilestoneStatus.READY_TO_INVOICE);
		actAsAccountant();

		AcceptanceDetailRes linked = linkService.link(created.id(), new AcceptanceMilestoneLinkReq(milestone.getId()));
		assertThat(linked.paymentMilestone().status()).isEqualTo(ContractMilestoneStatus.PENDING);

		assertThatThrownBy(() -> milestoneInvoiceService.createFromMilestone(contract.getId(), milestone.getId(), null))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
		assertThatThrownBy(() -> contractMilestoneService.updateStatus(contract.getId(), milestone.getId(),
				ContractMilestoneStatus.READY_TO_INVOICE))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE);
					assertThat(ex.getMessage()).contains(created.certificateCode(), "QTN-25");
				});
	}

	@Test
	@DisplayName("NCL-12-CN-003: chot chan cuoi — moc READY_TO_INVOICE nhung phieu gan kem chua xac nhan van bi chan lap hoa don")
	void invoiceValidatorBlocksReadyMilestoneWithUnconfirmedCertificate() {
		AcceptanceDetailRes created = createCertificate(workPackage);
		ContractMilestone milestone = milestone(contract, "Dot 1", "300000000",
				ContractMilestoneStatus.READY_TO_INVOICE);
		AcceptanceCertificate certificate = em.find(AcceptanceCertificate.class, created.id());
		certificate.setContractMilestoneId(milestone.getId()); // du lieu lech (vd sua tay CSDL)
		em.flush();

		assertThatThrownBy(() -> milestoneInvoiceService.createFromMilestone(contract.getId(), milestone.getId(), null))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getMessage()).contains(created.certificateCode()));
	}

	@Test
	@DisplayName("NCL-12-CN-003: moc khac hop dong / moc da gan phieu khac / moc da xuat hoa don -> chan")
	void rejectsInvalidMilestoneLinks() {
		AcceptanceDetailRes first = createCertificate(workPackage);
		WorkPackage second = workPackage(project, null, "Giai doan 2");
		AcceptanceDetailRes other = createCertificate(second);
		ContractMilestone foreign = milestone(contract(), "Hop dong khac", "100", ContractMilestoneStatus.PENDING);
		ContractMilestone milestone = milestone(contract, "Dot 1", "300000000", ContractMilestoneStatus.PENDING);
		ContractMilestone invoiced = milestone(contract, "Dot 0", "100", ContractMilestoneStatus.INVOICED);
		actAsAccountant();

		assertThatThrownBy(() -> linkService.link(first.id(), new AcceptanceMilestoneLinkReq(foreign.getId())))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
		assertThatThrownBy(() -> linkService.link(first.id(), new AcceptanceMilestoneLinkReq(invoiced.getId())))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
		linkService.link(first.id(), new AcceptanceMilestoneLinkReq(milestone.getId()));
		assertThatThrownBy(() -> linkService.link(other.id(), new AcceptanceMilestoneLinkReq(milestone.getId())))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_DATA));
	}

	@Test
	@DisplayName("NCL-12-CN-003: go phieu khoi moc da mo -> moc ve cho nghiem thu; khai bao lai moc bi chan khi con lien ket")
	void unlinkHoldsMilestoneAndReplaceIsBlockedWhileLinked() {
		AcceptanceDetailRes created = createCertificate(workPackage);
		confirmationService.confirm(created.id(), new AcceptanceConfirmReq("A", TODAY, "/f.pdf"));
		ContractMilestone milestone = milestone(contract, "Dot 1", "1000", ContractMilestoneStatus.PENDING);
		actAsAccountant();
		linkService.link(created.id(), new AcceptanceMilestoneLinkReq(milestone.getId()));

		assertThatThrownBy(() -> contractMilestoneService.replace(contract.getId(),
				List.of(new ContractMilestoneReq("Moi", null, new BigDecimal("1000000000"), null, null))))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getMessage()).contains("phieu nghiem thu"));

		AcceptanceDetailRes unlinked = linkService.unlink(created.id());
		assertThat(unlinked.paymentMilestone()).isNull();
		assertThat(em.find(ContractMilestone.class, milestone.getId()).getStatus())
				.isEqualTo(ContractMilestoneStatus.PENDING);
	}

	// ---------------------------------------------------------------- NCL-12-CN-004

	@Test
	@DisplayName("NCL-12-CN-004-TC-01: ban giao lan hai -> luu phien ban moi, giu nguyen phien ban cu, danh dau ban moi nhat")
	void newVersionKeepsOldVersions() {
		DeliverableRes deliverable = deliverableService.create(project.getId(),
				new DeliverableCreateReq(workPackage.getId(), "Ban cai dat", DeliverableType.SOFTWARE_BUILD, "mo ta"));
		deliverableService.addVersion(deliverable.id(), version("v1", TODAY.minusDays(10)));
		deliverableService.addVersion(deliverable.id(), version("v2", TODAY));

		DeliverableRes res = deliverableService.get(deliverable.id());
		assertThat(res.versionCount()).isEqualTo(2);
		assertThat(res.latestVersion().versionNo()).isEqualTo("v2");
		assertThat(res.versions()).extracting(v -> v.versionNo() + ":" + v.latest())
				.containsExactly("v2:true", "v1:false");
		verify(auditLogService, org.mockito.Mockito.times(2)).record(eq("Bàn giao phiên bản sản phẩm"),
				eq(AuditTargetType.ACCEPTANCE), eq(deliverable.id()), anyString(), anyString());
	}

	@Test
	@DisplayName("NCL-12-CN-004-TC-02: trung so phien ban (khong phan biet hoa thuong) -> bao trung, khong luu")
	void duplicateVersionIsRejected() {
		DeliverableRes deliverable = deliverableService.create(project.getId(),
				new DeliverableCreateReq(workPackage.getId(), "Tai lieu", DeliverableType.DOCUMENT, null));
		deliverableService.addVersion(deliverable.id(), version("V1.0", TODAY));

		assertThatThrownBy(() -> deliverableService.addVersion(deliverable.id(), version(" v1.0 ", TODAY)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_DATA));
		assertThat(deliverableService.listVersions(deliverable.id())).hasSize(1);
	}

	@Test
	@DisplayName("NCL-12-CN-004: trung ten san pham trong hang muc / PM khac du an / ngay ban giao tuong lai -> chan")
	void deliverableGuards() {
		deliverableService.create(project.getId(),
				new DeliverableCreateReq(workPackage.getId(), "Tai lieu", DeliverableType.DOCUMENT, null));
		assertThatThrownBy(() -> deliverableService.create(project.getId(),
				new DeliverableCreateReq(workPackage.getId(), "TAI LIEU", DeliverableType.DOCUMENT, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_DATA));

		DeliverableRes other = deliverableService.create(project.getId(),
				new DeliverableCreateReq(workPackage.getId(), "Khac", DeliverableType.OTHER, null));
		assertThatThrownBy(() -> deliverableService.addVersion(other.id(), version("1", TODAY.plusDays(1))))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));

		actAsProjectManager(OTHER_PM_ID);
		assertThatThrownBy(() -> deliverableService.list(project.getId(), null))
				.isInstanceOf(AccessDeniedException.class);
		verify(auditLogService, never()).record(eq("Bàn giao phiên bản sản phẩm"), eq(AuditTargetType.ACCEPTANCE),
				eq(other.id()), anyString(), anyString());
	}

	// ---------------------------------------------------------------- helpers

	private AcceptanceDetailRes createCertificate(WorkPackage pack) {
		task(pack, "Cong viec " + UNIQUE.incrementAndGet(), TaskStatus.DONE);
		return certificateService.create(project.getId(),
				new AcceptanceCreateReq(pack.getId(), null, new BigDecimal("300000000"), null));
	}

	private DeliverableVersionReq version(String no, LocalDate date) {
		return new DeliverableVersionReq(no, date, "Le Van C", "/files/" + no.trim(), null);
	}

	private void actAsProjectManager(long userId) {
		when(currentUserScopeProvider.currentUserId()).thenReturn(userId);
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("pm", "x",
				List.of(new SimpleGrantedAuthority("ROLE_VT-02"))));
	}

	private void actAsAccountant() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(50L);
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("ketoan", "x",
				List.of(new SimpleGrantedAuthority("ROLE_VT-05"))));
	}

	private Contract contract() {
		int n = UNIQUE.incrementAndGet();
		Contract value = new Contract();
		value.setContractCode("HDNT" + n);
		value.setName("Hop dong " + n);
		value.setCustomerId(1L);
		value.setContractType(ContractType.FIXED_PRICE);
		value.setTotalValue(new BigDecimal("1000000000"));
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private Project project(Contract owner, long managerId, ProjectStatus status) {
		int n = UNIQUE.incrementAndGet();
		Project value = new Project();
		value.setProjectCode("DA-NT-" + n);
		value.setName("Du an " + n);
		value.setContractId(owner.getId());
		value.setCustomerId(1L);
		value.setProjectType("FIXED_PRICE");
		value.setStartDate(LocalDate.of(2026, 9, 1));
		value.setExpectedEndDate(LocalDate.of(2026, 12, 31));
		value.setProjectManagerId(managerId);
		value.setStatus(status);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private WorkPackage workPackage(Project owner, Long parentId, String name) {
		WorkPackage value = new WorkPackage();
		value.setProjectId(owner.getId());
		value.setParentId(parentId);
		value.setName(name);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private Task task(WorkPackage pack, String name, TaskStatus status) {
		Task value = new Task();
		value.setProjectId(pack.getProjectId());
		value.setWorkPackageId(pack.getId());
		value.setName(name);
		value.setStatus(status);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		em.flush();
		return value;
	}

	private ContractMilestone milestone(Contract owner, String name, String amount, ContractMilestoneStatus status) {
		ContractMilestone value = new ContractMilestone();
		value.setContractId(owner.getId());
		value.setName(name);
		value.setAmount(new BigDecimal(amount));
		value.setStatus(status);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		value.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		em.flush();
		return value;
	}
}
