package com.serviceops.modules.customer.service.impl;

import com.serviceops.modules.customer.dto.response.CustomerOverviewItemRes;
import com.serviceops.modules.customer.service.CustomerOverviewDataProvider;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EmptyCustomerOverviewDataProvider implements CustomerOverviewDataProvider {
	@Override
	public List<CustomerOverviewItemRes> opportunities(Long customerId) {
		return List.of();
	}

	@Override
	public List<CustomerOverviewItemRes> contracts(Long customerId) {
		return List.of();
	}

	@Override
	public List<CustomerOverviewItemRes> projects(Long customerId) {
		return List.of();
	}

	@Override
	public List<CustomerOverviewItemRes> invoices(Long customerId) {
		return List.of();
	}

	@Override
	public List<CustomerOverviewItemRes> receivables(Long customerId) {
		return List.of();
	}
}