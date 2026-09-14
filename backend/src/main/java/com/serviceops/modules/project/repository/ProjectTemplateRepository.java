package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.ProjectTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectTemplateRepository extends JpaRepository<ProjectTemplate, Long> {

	/** Danh sách mẫu đang hoạt động, dùng cho combobox chọn mẫu khi tạo dự án (NCL-05-CN-007). */
	List<ProjectTemplate> findByActiveTrueOrderByNameAsc();
}
