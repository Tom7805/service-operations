package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.TaskAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskAssignmentRepository extends JpaRepository<TaskAssignment, Long> {
	List<TaskAssignment> findByTaskIdOrderByIdAsc(Long taskId);

	/** NCL-05-CN-004: danh sach cong viec dang duoc giao cho mot nguoi dung, moi nhat truoc. */
	List<TaskAssignment> findByUserIdOrderByIdDesc(Long userId);

	boolean existsByTaskIdAndUserId(Long taskId, Long userId);

	void deleteByTaskId(Long taskId);
}