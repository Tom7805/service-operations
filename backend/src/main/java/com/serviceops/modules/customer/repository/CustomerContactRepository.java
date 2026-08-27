package com.serviceops.modules.customer.repository;

import com.serviceops.modules.customer.entity.CustomerContact;
import com.serviceops.modules.customer.enums.ContactRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerContactRepository extends JpaRepository<CustomerContact, Long> {

	/** Danh sach nguoi lien he cua mot khach hang (NCL-02-CN-003). */
	List<CustomerContact> findByCustomerId(Long customerId);

	/** Dau moi chinh hien tai cua khach hang, neu co (TC-02). */
	Optional<CustomerContact> findByCustomerIdAndRole(Long customerId, ContactRole role);
}
