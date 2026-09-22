package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.InvoiceProposalLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface InvoiceProposalLineRepository extends JpaRepository<InvoiceProposalLine, Long> {

	/**
	 * Trong so cac dong gio cong duoc hoi, nhung dong da nam trong mot de nghi xuat hoa don (QTN-18: "chua tung xuat
	 * hoa don"). Truyen danh sach rong se lam JPQL {@code IN ()} loi tren mot so DB nen noi goi phai chan truoc.
	 */
	@Query("SELECT l.timeEntryId FROM InvoiceProposalLine l WHERE l.timeEntryId IN :timeEntryIds")
	List<Long> findProposedTimeEntryIds(@Param("timeEntryIds") Collection<Long> timeEntryIds);

	List<InvoiceProposalLine> findByInvoiceProposalIdOrderByIdAsc(Long invoiceProposalId);
}
