package com.serviceops.modules.customer.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.response.CustomerOverviewRes;
import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerOverviewDataProvider;
import com.serviceops.modules.customer.service.CustomerOverviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerOverviewServiceImpl implements CustomerOverviewService {
	private final CustomerRepository customerRepository;
	private final CustomerMapper customerMapper;
	private final CustomerOverviewDataProvider dataProvider;
	private final CustomerAuditLogRepository auditLogRepository;

	@Override
	public CustomerOverviewRes getOverview(Long customerId) {
		var customer = customerRepository.findById(customerId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so khach hang: " + customerId));

		recordAudit(customerId);
		return new CustomerOverviewRes(customerMapper.toResponse(customer),
				ordered(dataProvider.opportunities(customerId)),
				ordered(dataProvider.contracts(customerId)),
				ordered(dataProvider.projects(customerId)),
				ordered(dataProvider.invoices(customerId)),
				ordered(dataProvider.receivables(customerId)));
	}

	private List<com.serviceops.modules.customer.dto.response.CustomerOverviewItemRes> ordered(
			List<com.serviceops.modules.customer.dto.response.CustomerOverviewItemRes> items) {
		return items.stream()
				.sorted(java.util.Comparator.comparing(
						com.serviceops.modules.customer.dto.response.CustomerOverviewItemRes::date,
						java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
				.toList();
	}

	private void recordAudit(Long customerId) {
		CustomerAuditLog audit = new CustomerAuditLog();
		audit.setCustomerId(customerId);
		audit.setActionType(CustomerAuditAction.VIEW_OVERVIEW);
		audit.setDetail("Xem ho so tong hop khach hang: " + customerId);
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		audit.setActorUsername(authentication == null ? null : authentication.getName());
		auditLogRepository.save(audit);
	}
}
