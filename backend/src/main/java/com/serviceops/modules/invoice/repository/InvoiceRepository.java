package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

	/**
	 * Tim hoa don theo hop dong (tuy chon) va tap trang thai, moi nhat truoc (NCL-10-CN-003).
	 * {@code statuses} khong duoc rong — noi goi truyen day du cac trang thai khi khong loc.
	 */
	@Query("""
			SELECT i FROM Invoice i
			WHERE (:contractId IS NULL OR i.contractId = :contractId)
			AND i.status IN :statuses
			ORDER BY i.id DESC
			""")
	List<Invoice> search(@Param("contractId") Long contractId,
			@Param("statuses") Collection<InvoiceStatus> statuses);

	/**
	 * Doc hoa don kem khoa ghi (SELECT ... FOR UPDATE) — dung khi ghi nhan thanh toan
	 * (NCL-10-CN-003) de hai luot ghi cung luc cho mot hoa don xep hang tuan tu, khong
	 * cung doc "so con phai thu" cu roi cung vuot tong hoa don.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT i FROM Invoice i WHERE i.id = :id")
	Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

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
