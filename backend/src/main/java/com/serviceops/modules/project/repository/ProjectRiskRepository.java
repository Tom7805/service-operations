package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.ProjectRisk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRiskRepository extends JpaRepository<ProjectRisk, Long> {

	List<ProjectRisk> findByProjectIdOrderByIdAsc(Long projectId);
}
