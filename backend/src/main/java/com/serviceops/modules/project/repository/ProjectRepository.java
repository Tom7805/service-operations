package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {
}