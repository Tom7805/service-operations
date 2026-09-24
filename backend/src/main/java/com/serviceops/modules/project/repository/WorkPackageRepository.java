package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.WorkPackage;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkPackageRepository extends JpaRepository<WorkPackage, Long> {
	List<WorkPackage> findByProjectIdOrderBySortOrderAscIdAsc(Long projectId);

	/**
	 * NCL-12-CN-001: khoa ghi dong hang muc de hai luot lap phieu nghiem thu cung mot hang muc chay
	 * tuan tu — luot sau thay phieu cua luot truoc va bi chan, khong sinh hai phieu dang hieu luc.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT w FROM WorkPackage w WHERE w.id = :id")
	Optional<WorkPackage> findByIdForUpdate(@Param("id") Long id);
}
