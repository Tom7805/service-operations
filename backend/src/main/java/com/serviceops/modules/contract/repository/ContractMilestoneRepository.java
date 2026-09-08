package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.ContractMilestone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Truy van moc thanh toan cua hop dong (NCL-04-CN-003).
 */
public interface ContractMilestoneRepository extends JpaRepository<ContractMilestone, Long> {

	/** Danh sach moc cua mot hop dong, theo dung thu tu hien thi. */
	List<ContractMilestone> findByContractIdOrderBySortOrderAsc(Long contractId);

	/** Xoa toan bo moc cu truoc khi luu danh sach moi (thay the hoan toan - xem service). */
	void deleteByContractId(Long contractId);
}
