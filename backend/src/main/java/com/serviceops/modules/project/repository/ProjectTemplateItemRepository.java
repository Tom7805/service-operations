package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.ProjectTemplateItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectTemplateItemRepository extends JpaRepository<ProjectTemplateItem, Long> {

	/** Toàn bộ đầu việc của một mẫu, sắp xếp để hạng mục/công việc cha luôn đứng trước con. */
	List<ProjectTemplateItem> findByTemplateIdOrderByIdAsc(Long templateId);
}
