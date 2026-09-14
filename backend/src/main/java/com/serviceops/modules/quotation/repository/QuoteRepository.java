package com.serviceops.modules.quotation.repository;

import com.serviceops.modules.quotation.entity.Quote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuoteRepository extends JpaRepository<Quote, Long> {

	Optional<Quote> findTopByOpportunityIdOrderByVersionDesc(Long opportunityId);

	List<Quote> findAllByOpportunityIdOrderByVersionDesc(Long opportunityId);
}