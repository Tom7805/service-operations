package com.serviceops.modules.customer.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerMergeReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.MergePreviewRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.entity.CustomerDuplicateOverrideLog;
import com.serviceops.modules.customer.entity.CustomerMergeLog;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.enums.CustomerStatus;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerDuplicateOverrideLogRepository;
import com.serviceops.modules.customer.repository.CustomerMergeLogRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerMergeService;
import com.serviceops.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * NCL-02-CN-006: Gop hai ho so khach hang trung thanh mot (QTN-05).
 *
 * <p>Ho so "giu lai" ({@code targetCustomerId}) nhan toan bo du lieu lien quan hien
 * co cua ho so "bi gop" ({@code sourceCustomerId}): nhat ky khach hang va ly do bo
 * qua canh bao trung. Moi ban ghi duoc chuyen deu duoc danh dau
 * {@code originalCustomerId} de giu dau vet nguon goc (TC-02), ke ca khi ho so bi
 * gop dang con du lieu lien quan chua xu ly xong - thao tac gop van duoc thuc hien,
 * khong bi chan lai boi ly do do.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CustomerMergeServiceImpl implements CustomerMergeService {

	private final CustomerRepository customerRepository;
	private final CustomerMapper customerMapper;
	private final CustomerAuditLogRepository auditLogRepository;
	private final CustomerDuplicateOverrideLogRepository overrideLogRepository;
	private final CustomerMergeLogRepository mergeLogRepository;

	@Override
	@Transactional(readOnly = true)
	public MergePreviewRes preview(CustomerMergeReq request) {
		Customer target = requireMergeableCustomer(request.targetCustomerId(), "giu lai");
		Customer source = requireMergeableCustomer(request.sourceCustomerId(), "bi gop");
		requireDifferentCustomers(target, source);

		long relatedRecordCount = auditLogRepository.findByCustomerIdOrderByCreatedAtDesc(source.getId()).size()
				+ overrideLogRepository.findByCustomerId(source.getId()).size();

		return new MergePreviewRes(customerMapper.toResponse(target), customerMapper.toResponse(source),
				relatedRecordCount);
	}

	@Override
	public CustomerRes merge(CustomerMergeReq request) {
		Customer target = requireMergeableCustomer(request.targetCustomerId(), "giu lai");
		Customer source = requireMergeableCustomer(request.sourceCustomerId(), "bi gop");
		requireDifferentCustomers(target, source);

		// TC-01 + TC-02: chuyen toan bo du lieu lien quan hien co cua ho so bi gop ve ho so
		// giu lai. Khong kiem tra hay chan theo bat ky dieu kien nao cua du lieu do (vi du con
		// cong no chua thanh toan) - luon thuc hien gop va giu lai dau vet nguon goc.
		int movedAuditLogs = reassignAuditLogs(source.getId(), target.getId());
		int movedOverrideLogs = reassignOverrideLogs(source.getId(), target.getId());

		source.setStatus(CustomerStatus.MERGED);
		source.setMergedIntoId(target.getId());
		source.setMergedAt(LocalDateTime.now());
		customerRepository.save(source);

		recordMergeLog(source, target, movedAuditLogs, movedOverrideLogs);
		recordAuditOnTarget(target, source);

		log.info("CUSTOMER_MERGED sourceId={} sourceCode={} targetId={} targetCode={} by={}",
				source.getId(), source.getCode(), target.getId(), target.getCode(), currentUsername());

		return customerMapper.toResponse(target);
	}

	private Customer requireMergeableCustomer(Long id, String role) {
		Customer customer = customerRepository.findById(id)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so khach hang " + role + " (id=" + id + ")"));
		if (customer.getStatus() == CustomerStatus.MERGED) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ho so " + customer.getCode() + " da duoc gop truoc do, khong the tiep tuc su dung");
		}
		return customer;
	}

	private void requireDifferentCustomers(Customer target, Customer source) {
		if (target.getId().equals(source.getId())) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ho so giu lai va ho so bi gop khong duoc trung nhau");
		}
	}

	private int reassignAuditLogs(Long sourceId, Long targetId) {
		List<CustomerAuditLog> logs = auditLogRepository.findByCustomerIdOrderByCreatedAtDesc(sourceId);
		for (CustomerAuditLog auditLog : logs) {
			if (auditLog.getOriginalCustomerId() == null) {
				auditLog.setOriginalCustomerId(sourceId);
			}
			auditLog.setCustomerId(targetId);
		}
		auditLogRepository.saveAll(logs);
		return logs.size();
	}

	private int reassignOverrideLogs(Long sourceId, Long targetId) {
		List<CustomerDuplicateOverrideLog> logs = overrideLogRepository.findByCustomerId(sourceId);
		for (CustomerDuplicateOverrideLog overrideLog : logs) {
			if (overrideLog.getOriginalCustomerId() == null) {
				overrideLog.setOriginalCustomerId(sourceId);
			}
			overrideLog.setCustomerId(targetId);
		}
		overrideLogRepository.saveAll(logs);
		return logs.size();
	}

	/** NCL-02-CN-006 TC-04: nhat ky chi tiet lan gop, luu snapshot vi ho so bi gop se chuyen trang thai ngay sau do. */
	private void recordMergeLog(Customer source, Customer target, int movedAuditLogs, int movedOverrideLogs) {
		CustomerMergeLog mergeLog = new CustomerMergeLog();
		mergeLog.setSourceCustomerId(source.getId());
		mergeLog.setSourceCustomerCode(source.getCode());
		mergeLog.setSourceCustomerName(source.getName());
		mergeLog.setTargetCustomerId(target.getId());
		mergeLog.setTargetCustomerCode(target.getCode());
		mergeLog.setTargetCustomerName(target.getName());
		mergeLog.setMovedRecordSummary("Da chuyen " + movedAuditLogs + " nhat ky khach hang va "
				+ movedOverrideLogs + " nhat ky bo qua canh bao trung ve ho so giu lai");
		mergeLog.setPerformedByUserId(currentUserId());
		mergeLog.setPerformedByUsername(currentUsername());
		mergeLogRepository.save(mergeLog);
	}

	/** NCL-02-CN-006 TC-04: ghi them vao "Nhat ky khach hang" chung cua ho so giu lai (cung co che voi TC-05 cua NCL-02-CN-002). */
	private void recordAuditOnTarget(Customer target, Customer source) {
		CustomerAuditLog auditLog = new CustomerAuditLog();
		auditLog.setCustomerId(target.getId());
		auditLog.setActionType(CustomerAuditAction.MERGE);
		auditLog.setDetail("Da gop ho so " + source.getCode() + " (" + source.getName() + ") vao ho so nay");
		auditLog.setActorUserId(currentUserId());
		auditLog.setActorUsername(currentUsername());
		auditLogRepository.save(auditLog);
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}

	private Long currentUserId() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails details)) {
			return null;
		}
		return details.getId();
	}
}
