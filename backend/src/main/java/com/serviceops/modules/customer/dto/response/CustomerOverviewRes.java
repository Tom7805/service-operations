package com.serviceops.modules.customer.dto.response;

import java.util.List;

public record CustomerOverviewRes(
	CustomerRes customer,
	List<CustomerOverviewItemRes> opportunities,
	List<CustomerOverviewItemRes> contracts,
	List<CustomerOverviewItemRes> projects,
	List<CustomerOverviewItemRes> invoices,
	List<CustomerOverviewItemRes> receivables
) {}
