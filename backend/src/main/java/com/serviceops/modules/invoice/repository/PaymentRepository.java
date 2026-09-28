package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

	/** Tong so tien khach hang da tra cho mot hoa don (0 neu chua co lan thanh toan nao). */
	@Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.invoiceId = :invoiceId")
	BigDecimal sumAmountByInvoiceId(@Param("invoiceId") Long invoiceId);

	/**
	 * Tong da thu cua nhieu hoa don trong mot truy van (tranh N+1 khi liet ke hoa don).
	 * Tra ve mang {@code [invoiceId, tongDaThu]}; hoa don chua co lan thanh toan nao khong xuat hien.
	 */
	@Query("SELECT p.invoiceId, SUM(p.amount) FROM Payment p WHERE p.invoiceId IN :invoiceIds GROUP BY p.invoiceId")
	List<Object[]> sumAmountByInvoiceIdIn(@Param("invoiceIds") Collection<Long> invoiceIds);

	/** Lich su thanh toan cua mot hoa don, ngay thanh toan moi nhat truoc. */
	List<Payment> findByInvoiceIdOrderByPaymentDateDescIdDesc(Long invoiceId);
}
