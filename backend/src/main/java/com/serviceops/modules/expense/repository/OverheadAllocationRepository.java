package com.serviceops.modules.expense.repository;

import com.serviceops.modules.expense.entity.OverheadAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OverheadAllocationRepository extends JpaRepository<OverheadAllocation, Long> {

	/** Cac dong phan bo cua mot lan chay, sap theo du an. */
	List<OverheadAllocation> findByOverheadPoolIdOrderByProjectIdAsc(Long overheadPoolId);

	/** Lich su chi phi chung ma mot du an da nhan, moi nhat truoc. */
	List<OverheadAllocation> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
