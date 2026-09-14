package com.serviceops.modules.opportunity.repository;

import com.serviceops.modules.opportunity.entity.OpportunityActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OpportunityActivityRepository extends JpaRepository<OpportunityActivity, Long> {

	/**
	 * Dong thoi gian cham soc cua mot co hoi (NCL-03-CN-006): hoat dong moi
	 * nhat theo thoi diem dien ra ({@code occurredAt}) hien len dau; lay id
	 * giam dan lam tieu chi phu khi hai hoat dong trung occurredAt.
	 */
	List<OpportunityActivity> findByOpportunityIdOrderByOccurredAtDescIdDesc(Long opportunityId);
}
