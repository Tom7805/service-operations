package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.TaskAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskAssignmentRepository extends JpaRepository<TaskAssignment, Long> {
	List<TaskAssignment> findByTaskIdOrderByIdAsc(Long taskId);

	void deleteByTaskId(Long taskId);
}