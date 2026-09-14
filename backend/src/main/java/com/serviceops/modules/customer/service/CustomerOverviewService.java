package com.serviceops.modules.customer.service;

import com.serviceops.modules.customer.dto.response.CustomerOverviewRes;

public interface CustomerOverviewService {
	CustomerOverviewRes getOverview(Long customerId);
}
