package com.serviceops.modules.opportunity.repository;

import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {

	/** Lay cac co hoi cua mot khach hang (pipeline theo khach hang). */
	List<Opportunity> findByCustomerId(Long customerId);

	/** Lay cac co hoi theo giai doan (hien thi pipeline ban hang). */
	List<Opportunity> findByStage(OpportunityStage stage);
}
