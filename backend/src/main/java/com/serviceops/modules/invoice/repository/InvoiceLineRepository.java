package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.InvoiceLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvoiceLineRepository extends JpaRepository<InvoiceLine, Long> {

	/** NCL-13-CN-004: cac dong cua mot hoa don theo thu tu tao. */
	List<InvoiceLine> findByInvoiceIdOrderByIdAsc(Long invoiceId);
}
