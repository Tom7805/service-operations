package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContractRepository extends JpaRepository<Contract, Long>, JpaSpecificationExecutor<Contract> {

	/**
	 * Doc hop dong kem khoa ghi (SELECT ... FOR UPDATE) — dung khi lap hoa don
	 * (NCL-10-CN-002) de hai luot lap hoa don cung luc cho mot hop dong xep hang
	 * tuan tu, khong cung doc "tong da xuat" cu roi cung vuot QTN-19.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT c FROM Contract c WHERE c.id = :id")
	Optional<Contract> findByIdForUpdate(@Param("id") Long id);

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