package com.serviceops.modules.customer.repository;

import com.serviceops.modules.customer.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
	boolean existsByCode(String code);

	/** Tim ho so theo ten gan dung (chong trung ho so - NCL-02-CN-002, TC-01). */
	List<Customer> findByNameContainingIgnoreCase(String name);

	/** Tim ho so theo ma so thue chinh xac (chong trung ho so - TC-01). */
	Optional<Customer> findByTaxCode(String taxCode);
}
