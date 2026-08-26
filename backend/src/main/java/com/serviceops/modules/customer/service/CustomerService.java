package com.serviceops.modules.customer.service;

import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;

public interface CustomerService {
	CustomerRes create(CustomerCreateReq request);
}
