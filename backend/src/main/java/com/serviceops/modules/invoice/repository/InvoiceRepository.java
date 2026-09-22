package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.enums.InvoiceSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

	/** Nguon danh sach hoa don dinh ky da sinh cho mot hop dong (moi nhat truoc), phuc vu tra cuu. */
	List<Invoice> findByContractIdAndSourceOrderByIssueDateDescIdDesc(Long contractId, InvoiceSource source);

	List<Invoice> findBySourceOrderByIssueDateDescIdDesc(InvoiceSource source);

	long countByInvoiceNumberStartingWith(String prefix);

	/**
	 * Tong gia tri hoa don da lap (khong tinh hoa don da huy) cua mot hop dong — nguon so sanh voi
	 * han muc/gia tri hop dong truoc khi lap them (QTN-19, NCL-04-CN-005).
	 */
	@Query("""
			SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i
			WHERE i.contractId = :contractId
			AND i.status <> com.serviceops.modules.invoice.enums.InvoiceStatus.CANCELLED
			""")
	BigDecimal sumAmountByContractId(@Param("contractId") Long contractId);
}
