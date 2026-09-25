package com.serviceops.modules.admin.repository;

import com.serviceops.modules.admin.entity.BackupRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BackupRecordRepository extends JpaRepository<BackupRecord, Long> {

	List<BackupRecord> findAllByOrderByStartedAtDescIdDesc();
}
