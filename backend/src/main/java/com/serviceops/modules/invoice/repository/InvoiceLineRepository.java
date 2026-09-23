package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.InvoiceLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceLineRepository extends JpaRepository<InvoiceLine, Long> {
}
