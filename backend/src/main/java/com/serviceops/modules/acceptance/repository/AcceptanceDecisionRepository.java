package com.serviceops.modules.acceptance.repository;

import com.serviceops.modules.acceptance.entity.AcceptanceDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AcceptanceDecisionRepository extends JpaRepository<AcceptanceDecision, Long> {

	List<AcceptanceDecision> findByCertificateIdOrderByRecordedAtAscIdAsc(Long certificateId);
}
