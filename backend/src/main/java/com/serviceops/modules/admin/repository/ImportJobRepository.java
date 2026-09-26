package com.serviceops.modules.admin.repository;

import com.serviceops.modules.admin.entity.ImportJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImportJobRepository extends JpaRepository<ImportJob, Long> {

	List<ImportJob> findAllByOrderByCreatedAtDescIdDesc();
}
