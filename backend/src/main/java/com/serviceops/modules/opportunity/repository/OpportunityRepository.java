package com.serviceops.modules.opportunity.repository;

import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {

	/** Danh sach co hoi theo giai doan, moi nhat len truoc — dung de dung cot Kanban pipeline. */
	List<Opportunity> findByStageOrderByCreatedAtDesc(OpportunityStage stage);

	List<Opportunity> findAllByOrderByCreatedAtDesc();
}
