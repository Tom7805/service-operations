package com.serviceops.modules.customer.mapper;

import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.entity.Customer;
import org.springframework.stereotype.Component;

@Component
public class CustomerMapper {
	public CustomerRes toResponse(Customer customer) {
		return new CustomerRes(customer.getId(), customer.getCode(), customer.getName(),
				customer.getTaxCode(), customer.getPhone(), customer.getIndustry(), customer.getAddress(),
				customer.getCreatedAt(), customer.getCompanySize(), customer.getPriority());
	}
}
