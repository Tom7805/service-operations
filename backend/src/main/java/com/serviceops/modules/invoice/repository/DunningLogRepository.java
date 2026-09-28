package com.serviceops.modules.invoice.repository;

import com.serviceops.modules.invoice.entity.DunningLog;
import com.serviceops.modules.invoice.enums.DunningStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DunningLogRepository extends JpaRepository<DunningLog, Long> {

	/** QTN-27: da gui nhac cho hoa don nay dung stage + moc nay chua — chong gui trung (TC-02). */
	boolean existsByInvoiceIdAndStageAndReferenceDate(Long invoiceId, DunningStage stage, LocalDate referenceDate);

	/** Lich su nhac no cua mot hoa don, moi nhat truoc. */
	List<DunningLog> findByInvoiceIdOrderBySentAtDesc(Long invoiceId);
}
