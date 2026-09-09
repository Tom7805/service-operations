package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.ProjectMilestoneItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectMilestoneItemRepository extends JpaRepository<ProjectMilestoneItem, Long> {

	List<ProjectMilestoneItem> findByMilestoneIdOrderByIdAsc(Long milestoneId);

	void deleteByMilestoneId(Long milestoneId);
}
