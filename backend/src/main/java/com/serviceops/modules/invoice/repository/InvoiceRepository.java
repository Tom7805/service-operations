package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

	/**
	 * Tong gia tri da xuat hoa don cua mot hop dong, khong tinh hoa don da huy —
	 * can cu cua QTN-19 ("tong luy ke khong vuot gia tri hop dong").
	 */
	@Query("""
			SELECT COALESCE(SUM(i.totalAmount), 0)
			FROM Invoice i
			WHERE i.contractId = :contractId
			AND i.status <> com.serviceops.modules.invoice.enums.InvoiceStatus.CANCELLED
			""")
	BigDecimal sumActiveTotalByContractId(@Param("contractId") Long contractId);
}
