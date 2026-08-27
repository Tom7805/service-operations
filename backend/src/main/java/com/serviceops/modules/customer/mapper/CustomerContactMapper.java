package com.serviceops.modules.customer.mapper;

import com.serviceops.modules.customer.dto.response.CustomerContactRes;
import com.serviceops.modules.customer.entity.CustomerContact;
import com.serviceops.modules.customer.enums.ContactRole;
import org.springframework.stereotype.Component;

@Component
public class CustomerContactMapper {
	public CustomerContactRes toResponse(CustomerContact contact) {
		return new CustomerContactRes(contact.getId(), contact.getCustomerId(), contact.getFullName(),
				contact.getTitle(), contact.getEmail(), contact.getPhone(),
				contact.getRole() == ContactRole.PRIMARY, contact.getCreatedAt());
	}
}
