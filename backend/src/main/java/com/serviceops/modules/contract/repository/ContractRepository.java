package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Truy van hop dong (NCL-04). Cac phuong thuc theo opportunityId phuc vu
 * viec kiem tra va tim hop dong tao tu co hoi da thang (NCL-04-CN-001):
 * mot co hoi thang chi tao duoc mot hop dong (QTN-08) - rang buoc UNIQUE
 * (opportunity_id) o tang DB va canh bao truoc o tang service.
 */
public interface ContractRepository extends JpaRepository<Contract, Long> {

	/** Tim hop dong tao tu mot co hoi (NULL neu co hoi chua co hop dong). */
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

	/**
	 * Toan bo hop dong cua mot khach hang, dung cho ho so tong hop khach hang
	 * (NCL-02-CN-004) de nguoi dung tim duoc hop dong roi thao tac cac nghiep
	 * vu NCL-04 (khai bao loai/han muc, moc thanh toan, phu luc, gia han...).
	 */
	List<Contract> findByCustomerId(Long customerId);

	/**
	 * Hop dong dang hieu luc co ngay ket thuc trong khoang [from, to] - dung
	 * cho nhac han hop dong sap het hieu luc (NCL-04-CN-006, TC-01).
	 */
	List<Contract> findByStatusAndEndDateBetween(ContractStatus status, LocalDate from, LocalDate to);

	/**
	 * Hop dong van o trang thai dang hieu luc (ACTIVE) nhung ngay ket thuc da
	 * qua {@code date} - tuc la da het han tren giay to ma chua duoc gia han
	 * hay dong lai. Day la truong hop khan cap can xu ly gap vi cong viec phat
	 * sinh sau moc nay khong con can cu hop dong (NCL-04-CN-006, TC-02).
	 */
	List<Contract> findByStatusAndEndDateBefore(ContractStatus status, LocalDate date);
}
