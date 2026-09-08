package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.ContractAmendment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Truy van phu luc dieu chinh hop dong (NCL-04-CN-004).
 */
public interface ContractAmendmentRepository extends JpaRepository<ContractAmendment, Long> {

	/** Lich su phu luc cua mot hop dong, moi lap gan nhat hien truoc. */
	List<ContractAmendment> findByContractIdOrderByCreatedAtDesc(Long contractId);

	/** Dem so phu luc da lap cua hop dong, dung sinh so thu tu cho amendment_no moi. */
	long countByContractId(Long contractId);
}
