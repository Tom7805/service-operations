package com.serviceops.modules.customer.repository;

import com.serviceops.modules.customer.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
	boolean existsByCode(String code);
}
