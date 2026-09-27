package com.serviceops.modules.acceptance.repository;

import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AcceptanceCertificateRepository extends JpaRepository<AcceptanceCertificate, Long> {

	/**
	 * Khoa ghi dong phieu de cac thao tac doi trang thai (xac nhan, tu choi, nop lai, gan moc) cua cung
	 * mot phieu chay tuan tu — hai nguoi bam cung luc khong the vua xac nhan vua tu choi.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT c FROM AcceptanceCertificate c WHERE c.id = :id")
	Optional<AcceptanceCertificate> findByIdForUpdate(@Param("id") Long id);

	List<AcceptanceCertificate> findByProjectIdOrderByIdDesc(Long projectId);

	List<AcceptanceCertificate> findByProjectIdInOrderByIdDesc(Collection<Long> projectIds);

	List<AcceptanceCertificate> findAllByOrderByIdDesc();

	/** Phieu con hieu luc cua mot nhom hang muc — dung de chan nghiem thu trung lap trong cung nhanh cay. */
	List<AcceptanceCertificate> findByWorkPackageIdInAndStatusIn(Collection<Long> workPackageIds,
			Collection<AcceptanceStatus> statuses);

	Optional<AcceptanceCertificate> findByContractMilestoneId(Long contractMilestoneId);

	List<AcceptanceCertificate> findByContractMilestoneIdIn(Collection<Long> contractMilestoneIds);

	boolean existsByContractMilestoneIdIn(Collection<Long> contractMilestoneIds);
}
