package com.serviceops.modules.admin.repository;

import com.serviceops.modules.admin.entity.ImportError;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImportErrorRepository extends JpaRepository<ImportError, Long> {

	List<ImportError> findByImportJobIdOrderByRowNumberAsc(Long importJobId);
}
