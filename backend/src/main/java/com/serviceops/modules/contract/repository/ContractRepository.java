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

	/** Kiem tra nhanh co hoi da co hop dong hay chua, chong tao trung. */
	boolean existsByOpportunityId(Long opportunityId);

	/**
	 * Hop dong dang hieu luc co ngay ket thuc trong khoang [from, to] - dung
	 * cho nhac han hop dong sap het hieu luc (NCL-04-CN-006, TC-01).
	 */
	List<Contract> findByStatusAndEndDateBetween(ContractStatus status, LocalDate from, LocalDate to);
}
