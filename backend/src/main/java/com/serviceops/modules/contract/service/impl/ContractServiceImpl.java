package com.serviceops.modules.contract.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.ContractCreateFromOpportunityReq;
import com.serviceops.modules.contract.dto.request.ContractTypeLimitReq;
import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.mapper.ContractMapper;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractService;
import com.serviceops.modules.contract.validator.ContractLimitValidator;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.quotation.entity.Quote;
import com.serviceops.modules.quotation.repository.QuoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Nghiep vu tao hop dong tu co hoi da thang (NCL-04-CN-001, QTN-08).
 *
 * <p>Luong xu ly (TC-01): doc co hoi - kiem tra da thang va chua co hop dong -
 * lay bao gia moi nhat lam nguon du lieu dung san - luu hop dong trang thai
 * DRAFT - ghi nhat ky CONTRACT_CREATE kem nguoi thuc hien va thoi diem (TC-04).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContractServiceImpl implements ContractService {

	private final OpportunityRepository opportunityRepository;
	private final QuoteRepository quoteRepository;
	private final ContractRepository contractRepository;
	private final CustomerRepository customerRepository;
	private final ContractMapper contractMapper;
	private final OpportunityAuditLogger auditLogger;
	private final ContractLimitValidator contractLimitValidator;
	private final ContractAuditLogger contractAuditLogger;

	@Override
	@Transactional
	public ContractRes createFromOpportunity(Long opportunityId, ContractCreateFromOpportunityReq request) {
		Opportunity opportunity = opportunityRepository.findById(opportunityId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay co hoi voi id=" + opportunityId));

		// QTN-08 (TC-02): hop dong chi tao tu co hoi da thang. Co hoi con dang mo
		// (chua chot WON) phai duoc cap nhat ket qua truoc khi tao hop dong.
		if (opportunity.getStage() != OpportunityStage.WON) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Co hoi chua o trang thai thang (WON), yeu cau cap nhat ket qua co hoi truoc khi tao hop dong");
		}

		// Chong tao trung: mot co hoi thang chi tao duoc mot hop dong (rang buoc
		// UNIQUE(opportunity_id) o tang DB la lop phong ve cuoi cung).
		if (contractRepository.existsByOpportunityId(opportunityId)) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Co hoi nay da co hop dong, khong the tao them");
		}

		// Dieu kien bat dau: co hoi thang phai co bao gia de dung san gia tri/noi dung.
		Quote quote = quoteRepository.findTopByOpportunityIdOrderByVersionDesc(opportunityId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
						"Co hoi thang chua co bao gia, khong the dung san hop dong"));

		if (request.startDate() != null && request.endDate() != null
				&& request.endDate().isBefore(request.startDate())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay ket thuc hop dong khong duoc som hon ngay bat dau");
		}

		Contract contract = new Contract();
		contract.setContractCode(generateContractCode());
		contract.setName(request.name() != null && !request.name().isBlank()
				? request.name().trim()
				: opportunity.getName());
		contract.setOpportunityId(opportunityId);
		contract.setCustomerId(opportunity.getCustomerId());
		contract.setQuoteId(quote.getId());
		contract.setContractType(request.contractType());
		contract.setTotalValue(request.totalValue() != null ? request.totalValue() : quote.getTotalAmount());
		contract.setStartDate(request.startDate());
		contract.setEndDate(request.endDate());
		contract.setStatus(ContractStatus.DRAFT);
		contract.setNotes(request.notes());
		contract.setCreatedBy(currentUsername());
		contract.setCreatedAt(LocalDateTime.now());
		contract = contractRepository.save(contract);

		// TC-04: ghi nguoi thuc hien, noi dung va thoi diem tao hop dong vao nhat ky.
		auditLogger.recordContractCreate(opportunityId,
				"Tao hop dong " + contract.getContractCode()
						+ " tu co hoi id=" + opportunityId
						+ ", gia tri=" + contract.getTotalValue()
						+ " tu bao gia id=" + quote.getId());

		log.info("CONTRACT_CREATED contractId={} code={} opportunityId={} by={}",
				contract.getId(), contract.getContractCode(), opportunityId, contract.getCreatedBy());

		String customerName = customerRepository.findById(contract.getCustomerId())
				.map(Customer::getName)
				.orElse(null);
		return contractMapper.toResponse(contract, customerName);
	}

	@Override
	@Transactional(readOnly = true)
	public ContractRes getById(Long contractId) {
		Contract contract = contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));
		String customerName = customerRepository.findById(contract.getCustomerId())
				.map(Customer::getName)
				.orElse(null);
		return contractMapper.toResponse(contract, customerName);
	}

	@Override
	@Transactional
	public ContractRes updateTypeAndLimit(Long contractId, ContractTypeLimitReq request) {
		Contract contract = contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));

		// Dieu chinh gia tri: null = giu nguyen gia tri hien tai cua hop dong.
		BigDecimal resolvedTotalValue = request.totalValue() != null
				? request.totalValue()
				: contract.getTotalValue();

		// QTN-19 (TC-02): han muc tran (neu co) phai khong nho hon gia tri hop dong,
		// neu khong he thong se khong the chinh sach chot hoa don khong vuot muc tran.
		contractLimitValidator.validate(resolvedTotalValue, request.limitValue());

		BigDecimal oldLimit = contract.getLimitValue();
		contract.setContractType(request.contractType());
		contract.setTotalValue(resolvedTotalValue);
		contract.setLimitValue(request.limitValue());
		contract = contractRepository.save(contract);

		// TC-04: ghi nguoi thuc hien (Ke toan), noi dung thay doi va thoi diem.
		contractAuditLogger.record(contractId, ContractAuditAction.TYPE_LIMIT_UPDATE,
				"Khai bao loai hop dong=" + request.contractType().name()
						+ ", gia tri=" + contract.getTotalValue()
						+ ", han muc tran=" + (request.limitValue() == null ? "khong dat" : request.limitValue())
						+ (oldLimit == null ? "" : " (han muc cu=" + oldLimit + ")"));

		log.info("CONTRACT_TYPE_LIMIT_UPDATED contractId={} type={} total={} limit={} by={}",
				contractId, request.contractType(), contract.getTotalValue(),
				request.limitValue(), currentUsername());

		String customerName = customerRepository.findById(contract.getCustomerId())
				.map(Customer::getName)
				.orElse(null);
		return contractMapper.toResponse(contract, customerName);
	}

	@Override
	@Transactional
	public ContractRes activate(Long contractId) {
		Contract contract = contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));

		if (contract.getStatus() != ContractStatus.DRAFT) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi kich hoat duoc hop dong dang o trang thai nhap (DRAFT); "
							+ "hop dong nay dang o trang thai " + contract.getStatus());
		}

		contract.setStatus(ContractStatus.ACTIVE);
		contract = contractRepository.save(contract);

		contractAuditLogger.record(contractId, ContractAuditAction.CONTRACT_ACTIVATE,
				"Kich hoat hop dong " + contract.getContractCode() + " tu DRAFT sang ACTIVE");

		log.info("CONTRACT_ACTIVATED contractId={} code={} by={}",
				contractId, contract.getContractCode(), currentUsername());

		String customerName = customerRepository.findById(contract.getCustomerId())
				.map(Customer::getName)
				.orElse(null);
		return contractMapper.toResponse(contract, customerName);
	}

	/** Ma hop dong duy nhat: HD- + thoi diem tao (ms) - du doc lap trong truong hop 2 nguoi tao cung luc. */
	private String generateContractCode() {
		return "HD-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase();
	}

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth == null ? null : auth.getName();
	}
}