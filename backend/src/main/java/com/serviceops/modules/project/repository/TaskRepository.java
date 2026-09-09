package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
	List<Task> findByProjectIdOrderByIdAsc(Long projectId);
}
