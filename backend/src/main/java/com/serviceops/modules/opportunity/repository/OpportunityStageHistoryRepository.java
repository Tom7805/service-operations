package com.serviceops.modules.opportunity.repository;

import com.serviceops.modules.opportunity.entity.OpportunityStageHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OpportunityStageHistoryRepository extends JpaRepository<OpportunityStageHistory, Long> {

	/** Lay lich su chuyen giai doan cua mot co hoi, moi nhat truoc (NCL-03-CN-002, TC-05). */
	List<OpportunityStageHistory> findByOpportunityIdOrderByChangedAtDesc(Long opportunityId);

	/**
	 * Toan bo lich su chuyen giai doan, moi nhat truoc — dung cho bao cao duong ong
	 * (NCL-03-CN-007) de tinh so ngay moi co hoi da nam o giai doan hien tai (TC-01/02)
	 * ma khong phai truy van tung co hoi mot.
	 */
	List<OpportunityStageHistory> findAllByOrderByChangedAtDesc();
}
