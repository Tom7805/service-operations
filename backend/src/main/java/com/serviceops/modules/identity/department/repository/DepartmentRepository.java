package com.serviceops.modules.identity.department.repository;

import com.serviceops.modules.identity.department.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
	List<Department> findAllByOrderByNameAsc();
	List<Department> findByParentId(Long parentId);
	List<Department> findByParentIsNull();
}
