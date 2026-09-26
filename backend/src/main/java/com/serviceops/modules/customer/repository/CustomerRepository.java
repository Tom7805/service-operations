package com.serviceops.modules.customer.repository;

import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.enums.CustomerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

	/**
	 * NCL-13-CN-001: cac ho so da gop vao mot trong {@code targetIds} (NCL-02-CN-006) — de pham vi cong
	 * khach hang cua ho so giu lai bao gom ca du lieu con nam o ho so da gop.
	 */
	List<Customer> findByMergedIntoIdIn(Collection<Long> targetIds);

	boolean existsByCode(String code);

	/** Ho so con hieu luc (khac MERGED) - tap ung vien so khop ten gan giong khi chong trung (NCL-02-CN-002, TC-01). */
	List<Customer> findByStatusNot(CustomerStatus status);

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
