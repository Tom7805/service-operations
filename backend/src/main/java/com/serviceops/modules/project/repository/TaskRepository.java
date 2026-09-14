package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
	List<Task> findByProjectIdOrderByIdAsc(Long projectId);

	List<Task> findByProjectIdAndStatusOrderByIdAsc(Long projectId, TaskStatus status);
}
