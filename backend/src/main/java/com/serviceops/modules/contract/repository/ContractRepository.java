package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContractRepository extends JpaRepository<Contract, Long> {

	Optional<Contract> findByOpportunityId(Long opportunityId);

	/**
	 * Toan bo hop dong, moi tao truoc - phuc vu man hinh "Hop dong" danh rieng
	 * cho Ke toan (VT-05) de tim va thao tac hop dong (khai bao loai/han muc,
	 * moc thanh toan, kich hoat) ma khong phai di qua ho so tong hop khach hang
	 * (NCL-04-CN-002). VT-05 co pham vi du lieu COMPANY nen thay tat ca.
	 */
	List<Contract> findAllByOrderByCreatedAtDesc();

	/** Kiem tra nhanh co hoi da co hop dong hay chua, chong tao trung. */
	boolean existsByOpportunityId(Long opportunityId);

	List<Contract> findByCustomerId(Long customerId);

	List<Contract> findByStatusAndEndDateBetween(ContractStatus status, LocalDate from, LocalDate to);

	List<Contract> findByStatusAndEndDateBefore(ContractStatus status, LocalDate date);
}