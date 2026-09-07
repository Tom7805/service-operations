package com.serviceops.modules.customer.repository;

import com.serviceops.modules.customer.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
	boolean existsByCode(String code);

	/** Tim ho so theo ten gan dung (chong trung ho so - NCL-02-CN-002, TC-01). */
	List<Customer> findByNameContainingIgnoreCase(String name);

	/**
	 * Tim toan bo ho so theo ma so thue chinh xac (chong trung ho so - TC-01).
	 * Tra ve List (khong phai Optional) vi tax_code khong co unique constraint o DB,
	 * du lieu cu/seed co the da ton tai nhieu ho so cung ma so thue - dung Optional
	 * se nem IncorrectResultSizeDataAccessException khi co >= 2 ban ghi trung.
	 */
	List<Customer> findByTaxCode(String taxCode);

	/** Lay toan bo ho so khach hang, ho so moi nhat len truoc (NCL-02-CN-001 buoc D: hien thi danh sach khach hang). */
	List<Customer> findAllByOrderByCreatedAtDesc();
}
