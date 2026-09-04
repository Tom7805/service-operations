package com.serviceops.modules.opportunity.repository;

import com.serviceops.modules.opportunity.entity.Opportunity;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Chi dua ra cac thao tac ma {@code NCL-03-CN-006} can (tim theo id, kiem tra
 * ton tai). Cac truy van tim kiem/liet ke theo bo loc se duoc bo sung khi
 * trien khai {@code NCL-03-CN-001}.
 */
public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {
}
