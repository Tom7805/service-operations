package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.WorkPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkPackageRepository extends JpaRepository<WorkPackage, Long> {
	List<WorkPackage> findByProjectIdOrderBySortOrderAscIdAsc(Long projectId);
}
