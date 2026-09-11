package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.ProjectMilestone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectMilestoneRepository extends JpaRepository<ProjectMilestone, Long> {

	List<ProjectMilestone> findByProjectIdOrderByPlannedDateAscIdAsc(Long projectId);
}
