package com.serviceops.modules.customer.service;

import com.serviceops.modules.customer.dto.response.CustomerOverviewItemRes;

import java.util.List;

/** Cổng đọc dữ liệu từ các module opportunity, contract, project và invoice. */
public interface CustomerOverviewDataProvider {
	List<CustomerOverviewItemRes> opportunities(Long customerId);

	List<CustomerOverviewItemRes> contracts(Long customerId);

	List<CustomerOverviewItemRes> projects(Long customerId);

	List<CustomerOverviewItemRes> invoices(Long customerId);

	List<CustomerOverviewItemRes> receivables(Long customerId);
}