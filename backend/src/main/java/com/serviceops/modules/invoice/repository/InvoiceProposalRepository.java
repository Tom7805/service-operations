package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.InvoiceProposal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvoiceProposalRepository extends JpaRepository<InvoiceProposal, Long> {

	/** Toan bo de nghi cua mot hop dong (moi trang thai), moi nhat truoc — man "Hop dong" cua Ke toan. */
	List<InvoiceProposal> findByContractIdOrderByIdDesc(Long contractId);
}
