package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

	/** Tong so tien khach hang da tra cho mot hoa don (0 neu chua co lan thanh toan nao). */
	@Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.invoiceId = :invoiceId")
	BigDecimal sumAmountByInvoiceId(@Param("invoiceId") Long invoiceId);
}
