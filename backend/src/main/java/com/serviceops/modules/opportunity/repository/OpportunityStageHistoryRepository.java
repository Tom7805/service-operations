package com.serviceops.modules.opportunity.repository;

import com.serviceops.modules.opportunity.entity.OpportunityStageHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OpportunityStageHistoryRepository extends JpaRepository<OpportunityStageHistory, Long> {

	/** Lay lich su chuyen giai doan cua mot co hoi, moi nhat truoc (NCL-03-CN-002, TC-05). */
	List<OpportunityStageHistory> findByOpportunityIdOrderByChangedAtDesc(Long opportunityId);
}
