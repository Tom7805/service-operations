package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
	List<Task> findByProjectIdOrderByIdAsc(Long projectId);

	List<Task> findByProjectIdAndStatusOrderByIdAsc(Long projectId, TaskStatus status);

	@Query("SELECT DISTINCT t FROM Task t WHERE t.id IN (SELECT te.taskId FROM TimeEntry te WHERE te.userId = :userId AND te.workDate BETWEEN :weekFrom AND :weekTo)")
	List<Task> findByTimeEntriesUserIdAndWorkDateBetween(Long userId, LocalDate weekFrom, LocalDate weekTo);
}
