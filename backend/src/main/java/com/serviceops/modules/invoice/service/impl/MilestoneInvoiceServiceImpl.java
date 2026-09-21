package com.serviceops.modules.invoice.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractMilestoneService;
import com.serviceops.modules.invoice.dto.request.InvoiceFromMilestoneReq;
import com.serviceops.modules.invoice.dto.response.InvoiceRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.InvoiceLine;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.service.MilestoneInvoiceService;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import com.serviceops.modules.invoice.validator.MilestoneAcceptanceValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Lap hoa don theo moc thanh toan cua hop dong (NCL-10-CN-002).
 *
 * <p>Khoa ghi dong hop dong ngay tu dau de moi luot lap hoa don cua cung mot hop dong
 * chay tuan tu: cung khoa nay bao ve ca kiem tra QTN-19 (tong luy ke) lan kiem tra
 * trang thai moc, nen hai ke toan bam nut cung luc khong the lap trung hay cung vuot
 * gia tri hop dong.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MilestoneInvoiceServiceImpl implements MilestoneInvoiceService {

	private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

	private final ContractRepository contractRepository;
	private final ContractMilestoneRepository milestoneRepository;
	private final ContractMilestoneService contractMilestoneService;
	private final InvoiceRepository invoiceRepository;
	private final InvoiceLineRepository invoiceLineRepository;
	private final MilestoneAcceptanceValidator acceptanceValidator;
	private final ContractValueLimitValidator limitValidator;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public InvoiceRes createFromMilestone(Long contractId, Long milestoneId, InvoiceFromMilestoneReq request) {
		Contract contract = contractRepository.findByIdForUpdate(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));
		if (contract.getContractType() != ContractType.FIXED_PRICE
				&& contract.getContractType() != ContractType.MILESTONE) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi lap hoa don theo moc cho hop dong tron goi (FIXED_PRICE) hoac theo moc (MILESTONE); "
							+ "hop dong " + contract.getContractType() + " lap hoa don theo luong khac");
		}

		ContractMilestone milestone = milestoneRepository.findById(milestoneId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay moc thanh toan voi id=" + milestoneId));
		if (!milestone.getContractId().equals(contractId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
					"Moc thanh toan voi id=" + milestoneId + " khong thuoc hop dong id=" + contractId);
		}
		acceptanceValidator.validate(milestone);

		BigDecimal amount = milestone.getAmount().setScale(2, RoundingMode.HALF_UP);
		BigDecimal alreadyInvoiced = invoiceRepository.sumActiveTotalByContractId(contractId)
				.setScale(2, RoundingMode.HALF_UP);
		limitValidator.validate(contract, alreadyInvoiced, amount);

		LocalDate today = LocalDate.now(clock);
		LocalDateTime now = LocalDateTime.now(clock);
		LocalDate invoiceDate = request != null && request.invoiceDate() != null ? request.invoiceDate() : today;
		LocalDate dueDate = request != null && request.dueDate() != null
				? request.dueDate()
				: invoiceDate.plusDays(Invoice.DEFAULT_PAYMENT_TERM_DAYS);
		if (dueDate.isBefore(invoiceDate)) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Han thanh toan (" + dueDate + ") khong duoc truoc ngay hoa don (" + invoiceDate + ")");
		}
		Invoice invoice = new Invoice();
		invoice.setInvoiceCode(generateInvoiceCode(today));
		invoice.setContractId(contractId);
		invoice.setCustomerId(contract.getCustomerId());
		invoice.setStatus(InvoiceStatus.ISSUED);
		invoice.setTotalAmount(amount);
		invoice.setInvoiceDate(invoiceDate);
		invoice.setDueDate(dueDate);
		invoice.setNote(request == null ? null : blankToNull(request.note()));
		invoice.setCreatedBy(currentUsername());
		invoice.setCreatedAt(now);
		invoice.setUpdatedAt(now);
		invoice = invoiceRepository.save(invoice);

		InvoiceLine line = new InvoiceLine();
		line.setInvoiceId(invoice.getId());
		line.setContractMilestoneId(milestoneId);
		line.setDescription("Thanh toan moc: " + milestone.getName());
		line.setAmount(amount);
		invoiceLineRepository.save(line);

		// Doi trang thai qua service cua module hop dong de giu dung trinh tu READY -> INVOICED
		// va nhat ky hop dong (MILESTONE_STATUS_UPDATE) thay vi tu ghi thang vao thuc the.
		contractMilestoneService.updateStatus(contractId, milestoneId, ContractMilestoneStatus.INVOICED);

		auditLogService.record("Lap hoa don theo moc hop dong", AuditTargetType.INVOICE, invoice.getId(),
				invoice.getInvoiceCode(),
				"Lap hoa don " + invoice.getInvoiceCode() + " gia tri " + amount + " cho moc \""
						+ milestone.getName() + "\" cua hop dong " + contract.getContractCode()
						+ " (tong da xuat " + alreadyInvoiced + " -> " + alreadyInvoiced.add(amount) + ")");

		return new InvoiceRes(invoice.getId(), invoice.getInvoiceCode(), contractId, milestoneId,
				milestone.getName(), invoice.getStatus().name(), amount, invoice.getInvoiceDate(),
				invoice.getDueDate(), invoice.getNote(), contract.getTotalValue(), alreadyInvoiced.add(amount),
				invoice.getCreatedBy(), invoice.getCreatedAt());
	}

	/** INV-yyyyMMdd-XXXXXX; cot invoice_code co UNIQUE nen trung ngau nhien (rat hiem) van bi chan o DB. */
	private String generateInvoiceCode(LocalDate date) {
		String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
		return "INV-" + CODE_DATE.format(date) + "-" + suffix;
	}

	private String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
