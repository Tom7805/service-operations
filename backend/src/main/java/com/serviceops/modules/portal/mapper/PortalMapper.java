package com.serviceops.modules.portal.mapper;

import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.entity.AcceptanceDecision;
import com.serviceops.modules.acceptance.entity.AcceptanceItem;
import com.serviceops.modules.acceptance.enums.AcceptanceItemType;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.entity.CustomerContact;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.InvoiceLine;
import com.serviceops.modules.invoice.entity.Payment;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceRes;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceSummaryRes;
import com.serviceops.modules.portal.dto.response.PortalAccountRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceDetailRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceRes;
import com.serviceops.modules.portal.entity.PortalAccount;
import com.serviceops.modules.project.entity.Project;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Chuyen entity noi bo sang du lieu hien thi. Cac ham {@code toPortal*} la "cua ra" duy nhat cua du lieu
 * sang cong khach hang: chi chep sang nhung truong da liet ke trong DTO cong (danh sach trang), khong bao gio
 * tra thang entity/DTO noi bo — them truong moi vao entity khong vo tinh lo ra cong.
 */
@Component
public class PortalMapper {

	public PortalAccountRes toAccountRes(PortalAccount account, User user, Customer customer, CustomerContact contact) {
		return new PortalAccountRes(account.getId(), account.getUserId(),
				user == null ? null : user.getUsername(),
				user == null ? null : user.getFullName(),
				user == null ? null : user.getEmail(),
				user == null ? null : user.getStatus(),
				account.getCustomerId(),
				customer == null ? null : customer.getCode(),
				customer == null ? null : customer.getName(),
				account.getContactId(),
				contact == null ? null : contact.getFullName(),
				contact == null ? null : contact.getTitle(),
				contact == null ? null : contact.getRole(),
				account.getStatusReason(), account.getStatusChangedBy(), account.getStatusChangedAt(),
				account.getCreatedBy(), account.getCreatedAt());
	}

	public PortalAcceptanceSummaryRes toPortalAcceptanceSummary(AcceptanceCertificate certificate, Project project,
			String workPackageName) {
		return new PortalAcceptanceSummaryRes(certificate.getId(), certificate.getCertificateCode(),
				certificate.getProjectId(), project == null ? null : project.getProjectCode(),
				project == null ? null : project.getName(), workPackageName, certificate.getTitle(),
				certificate.getAcceptedValue(), certificate.getStatus(), certificate.getRevisionNo(),
				certificate.getStatus() == AcceptanceStatus.PENDING_CONFIRMATION, certificate.getCreatedAt(),
				certificate.getUpdatedAt(), certificate.getConfirmedAt());
	}

	public PortalAcceptanceRes toPortalAcceptance(AcceptanceCertificate certificate, Project project,
			String workPackageName, List<AcceptanceItem> items, List<AcceptanceDecision> decisions) {
		List<String> tasks = items.stream()
				.filter(item -> item.getItemType() == AcceptanceItemType.TASK)
				.map(AcceptanceItem::getItemName)
				.toList();
		List<PortalAcceptanceRes.DeliverableItemRes> deliverables = items.stream()
				.filter(item -> item.getItemType() == AcceptanceItemType.DELIVERABLE)
				.map(item -> new PortalAcceptanceRes.DeliverableItemRes(item.getItemName(), item.getVersionNo()))
				.toList();
		List<PortalAcceptanceRes.DecisionRes> history = decisions.stream()
				.map(decision -> new PortalAcceptanceRes.DecisionRes(decision.getDecision(), decision.getChannel(),
						decision.getRevisionNo(), decision.getSignerName(), decision.getSignedDate(),
						decision.getReason(), decision.getRecordedAt()))
				.toList();
		return new PortalAcceptanceRes(certificate.getId(), certificate.getCertificateCode(),
				certificate.getProjectId(), project.getProjectCode(), project.getName(), workPackageName,
				certificate.getTitle(), certificate.getAcceptedValue(), certificate.getNote(), certificate.getStatus(),
				certificate.getRevisionNo(), certificate.getLastRejectionReason(), certificate.getSignerName(),
				certificate.getSignedDate(), certificate.getConfirmationChannel(), certificate.getConfirmedAt(),
				certificate.getStatus() == AcceptanceStatus.PENDING_CONFIRMATION, tasks, deliverables, history,
				certificate.getCreatedAt(), certificate.getUpdatedAt());
	}

	public PortalInvoiceRes toPortalInvoice(Invoice invoice, String contractCode, BigDecimal paidAmount,
			BigDecimal remainingAmount, boolean overdue, long daysOverdue) {
		return new PortalInvoiceRes(invoice.getId(), invoice.getInvoiceCode(), invoice.getContractId(), contractCode,
				invoice.getInvoiceDate(), invoice.getDueDate(), invoice.getStatus(), invoice.getTotalAmount(),
				paidAmount, remainingAmount, overdue, daysOverdue);
	}

	public PortalInvoiceDetailRes toPortalInvoiceDetail(PortalInvoiceRes invoice, List<InvoiceLine> lines,
			List<Payment> payments) {
		return new PortalInvoiceDetailRes(invoice,
				lines.stream().map(line -> new PortalInvoiceDetailRes.LineRes(line.getDescription(), line.getAmount()))
						.toList(),
				payments.stream().map(payment -> new PortalInvoiceDetailRes.PaymentRes(payment.getPaymentDate(),
						payment.getAmount(), payment.getMethod())).toList());
	}
}
