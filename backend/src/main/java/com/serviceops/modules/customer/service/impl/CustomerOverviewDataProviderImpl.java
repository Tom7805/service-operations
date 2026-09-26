package com.serviceops.modules.customer.service.impl;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.customer.dto.response.CustomerOverviewItemRes;
import com.serviceops.modules.customer.service.CustomerOverviewDataProvider;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.PaymentRepository;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.security.ProjectDataScopeGuard;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Doc du lieu that cho ho so tong hop khach hang (NCL-02-CN-004): co hoi, hop dong, du an (module
 * opportunity/contract/project) va hoa don, cong no phai thu (module invoice - NCL-10).
 *
 * <p><b>Pham vi du lieu (TC-02, QTN-01)</b> - nguoi co pham vi COMPANY thay het; nguoi con lai chi thay:</p>
 * <ul>
 *   <li>Du an: dung chung {@link ProjectDataScopeGuard} voi man hinh danh sach du an.</li>
 *   <li>Hop dong: an hop dong da co du an nhung khong du an nao trong pham vi (hop dong thuoc nhanh khac);
 *       hop dong chua mo du an van hien de Quan ly du an tao du an tu hop dong (NCL-05-CN-001).</li>
 *   <li>Hoa don va cong no: di theo hop dong - hop dong bi an thi hoa don cua no cung bi an.</li>
 *   <li>Co hoi: theo nguoi phu trach co hoi (SELF: chinh minh; DEPARTMENT: nguoi phu trach thuoc nhanh).</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class CustomerOverviewDataProviderImpl implements CustomerOverviewDataProvider {

	/** Hoa don hien o ho so tong hop: da phat hanh (bo nhap va da huy). */
	private static final Set<InvoiceStatus> VISIBLE_INVOICE_STATUSES =
			Set.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID);

	/** Hoa don con phai thu. */
	private static final Set<InvoiceStatus> RECEIVABLE_STATUSES =
			Set.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID);

	/** Trang thai hien thi cho khoan cong no da qua han thanh toan. */
	static final String OVERDUE_STATUS = "OVERDUE";

	private final OpportunityRepository opportunityRepository;
	private final ContractRepository contractRepository;
	private final ProjectRepository projectRepository;
	private final InvoiceRepository invoiceRepository;
	private final PaymentRepository paymentRepository;
	private final ProjectDataScopeGuard projectDataScopeGuard;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final UserRepository userRepository;
	private final Clock clock;

	@Override
	public List<CustomerOverviewItemRes> opportunities(Long customerId) {
		UserScope scope = currentUserScopeProvider.currentScope();
		Map<Long, Long> departmentByOwner = new HashMap<>();
		return opportunityRepository.findByCustomerId(customerId).stream()
				.filter(opportunity -> ownerVisible(scope, opportunity.getOwnerId(), departmentByOwner))
				.map(this::toItem)
				.toList();
	}

	@Override
	public List<CustomerOverviewItemRes> contracts(Long customerId) {
		return visibleContracts(customerId).stream()
				.map(this::toItem)
				.toList();
	}

	@Override
	public List<CustomerOverviewItemRes> projects(Long customerId) {
		return projectDataScopeGuard.filterVisible(projectRepository.findByCustomerIdOrderByIdDesc(customerId)).stream()
				.map(this::toItem)
				.toList();
	}

	@Override
	public List<CustomerOverviewItemRes> invoices(Long customerId) {
		Map<Long, Contract> contractsById = contractsById(customerId);
		return visibleInvoices(customerId, contractsById, VISIBLE_INVOICE_STATUSES).stream()
				.map(invoice -> new CustomerOverviewItemRes(invoice.getId(), invoice.getInvoiceCode(),
						invoiceName(invoice, contractsById), invoice.getStatus().name(), invoice.getTotalAmount(),
						invoice.getInvoiceDate(), null, invoice.getDueDate()))
				.toList();
	}

	/**
	 * Cong no phai thu: hoa don con so phai thu &gt; 0. Gia tri la so CON PHAI THU (tong hoa don tru da thu),
	 * ngay la han thanh toan; qua han thi trang thai la {@value #OVERDUE_STATUS}.
	 */
	@Override
	public List<CustomerOverviewItemRes> receivables(Long customerId) {
		Map<Long, Contract> contractsById = contractsById(customerId);
		List<Invoice> invoices = visibleInvoices(customerId, contractsById, RECEIVABLE_STATUSES);
		if (invoices.isEmpty()) {
			return List.of();
		}
		Map<Long, BigDecimal> paidByInvoice = paymentRepository
				.sumAmountByInvoiceIdIn(invoices.stream().map(Invoice::getId).toList()).stream()
				.collect(Collectors.toMap(row -> (Long) row[0], row -> (BigDecimal) row[1]));
		LocalDate today = LocalDate.now(clock);
		return invoices.stream()
				.map(invoice -> {
					BigDecimal remaining = invoice.getTotalAmount()
							.subtract(paidByInvoice.getOrDefault(invoice.getId(), BigDecimal.ZERO));
					if (remaining.signum() <= 0) {
						return null;
					}
					boolean overdue = invoice.getDueDate() != null && invoice.getDueDate().isBefore(today);
					return new CustomerOverviewItemRes(invoice.getId(), invoice.getInvoiceCode(),
							invoiceName(invoice, contractsById),
							overdue ? OVERDUE_STATUS : invoice.getStatus().name(), remaining,
							invoice.getDueDate(), null, invoice.getDueDate());
				})
				.filter(Objects::nonNull)
				.toList();
	}

	private List<Contract> visibleContracts(Long customerId) {
		List<Contract> contracts = contractRepository.findByCustomerId(customerId);
		if (currentUserScopeProvider.currentScope().isCompanyWide()) {
			return contracts;
		}
		List<Project> projects = projectRepository.findByCustomerIdOrderByIdDesc(customerId);
		Set<Long> contractsWithProject = projects.stream().map(Project::getContractId)
				.filter(Objects::nonNull).collect(Collectors.toSet());
		Set<Long> contractsWithVisibleProject = projectDataScopeGuard.filterVisible(projects).stream()
				.map(Project::getContractId).filter(Objects::nonNull).collect(Collectors.toSet());
		return contracts.stream()
				.filter(contract -> !contractsWithProject.contains(contract.getId())
						|| contractsWithVisibleProject.contains(contract.getId()))
				.toList();
	}

	private Map<Long, Contract> contractsById(Long customerId) {
		return visibleContracts(customerId).stream()
				.collect(Collectors.toMap(Contract::getId, Function.identity(), (a, b) -> a));
	}

	private List<Invoice> visibleInvoices(Long customerId, Map<Long, Contract> visibleContractsById,
			Set<InvoiceStatus> statuses) {
		return invoiceRepository.findByCustomerIdInAndStatusInOrderByInvoiceDateDescIdDesc(List.of(customerId), statuses)
				.stream()
				.filter(invoice -> visibleContractsById.containsKey(invoice.getContractId()))
				.toList();
	}

	private String invoiceName(Invoice invoice, Map<Long, Contract> contractsById) {
		Contract contract = contractsById.get(invoice.getContractId());
		return contract == null ? "Hóa đơn " + invoice.getInvoiceCode()
				: "Hóa đơn hợp đồng " + contract.getContractCode();
	}

	private boolean ownerVisible(UserScope scope, Long ownerId, Map<Long, Long> departmentByOwner) {
		if (scope.isCompanyWide()) {
			return true;
		}
		if (ownerId == null) {
			return false;
		}
		if (ownerId.equals(currentUserScopeProvider.currentUserId())) {
			return true;
		}
		if (scope.type() == DataScopeType.DEPARTMENT) {
			Long departmentId = departmentByOwner.computeIfAbsent(ownerId,
					id -> userRepository.findById(id).map(User::getDepartmentId).orElse(null));
			return scope.allowsDepartment(departmentId);
		}
		return false;
	}

	/** Co hoi khong co ma rieng (chi hop dong moi co contractCode) nen code = null. */
	private CustomerOverviewItemRes toItem(Opportunity opportunity) {
		return new CustomerOverviewItemRes(opportunity.getId(), null, opportunity.getName(),
				opportunity.getStage().name(), opportunity.getExpectedValue(), opportunity.getExpectedCloseDate(), null, null);
	}

	private CustomerOverviewItemRes toItem(Contract contract) {
		return new CustomerOverviewItemRes(contract.getId(), contract.getContractCode(), contract.getName(),
				contract.getStatus().name(), contract.getTotalValue(), contract.getStartDate(),
				contract.getContractType() == null ? null : contract.getContractType().name(), contract.getEndDate());
	}

	/** Du an khong co "gia tri hop dong" rieng nen dung han muc ke thua (limitValue) cho cot Gia tri. */
	private CustomerOverviewItemRes toItem(Project project) {
		return new CustomerOverviewItemRes(project.getId(), project.getProjectCode(), project.getName(),
				project.getStatus().name(), project.getLimitValue(), project.getStartDate(), null, null);
	}
}
