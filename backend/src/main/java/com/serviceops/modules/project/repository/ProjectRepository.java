package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

	/** NCL-05-CN-001: danh sach du an cua mot hop dong, moi nhat truoc. */
	List<Project> findByContractIdOrderByIdDesc(Long contractId);
}