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

	/** NCL-14-CN-003: cong viec co ngan sach gio > 0 thuoc du an dang o trang thai {@code status} — dau vao cua tac vu ra soat vuot ngan sach. */
	@Query("SELECT t FROM Task t WHERE t.budgetHours IS NOT NULL AND t.budgetHours > 0"
			+ " AND t.projectId IN (SELECT p.id FROM Project p WHERE p.status = :status)")
	List<Task> findBudgetedTasksOfProjectsInStatus(com.serviceops.modules.project.enums.ProjectStatus status);
}
