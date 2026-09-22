package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.InvoiceProposal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceProposalRepository extends JpaRepository<InvoiceProposal, Long> {
}
