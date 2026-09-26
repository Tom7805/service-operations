package com.serviceops.modules.admin.repository;

import com.serviceops.modules.admin.entity.RestoreRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RestoreRequestRepository extends JpaRepository<RestoreRequest, Long> {

	List<RestoreRequest> findByBackupIdOrderByRequestedAtDesc(Long backupId);
}
