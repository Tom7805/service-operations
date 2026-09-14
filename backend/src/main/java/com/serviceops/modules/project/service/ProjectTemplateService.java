package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.request.ProjectCreateFromTemplateReq;
import com.serviceops.modules.project.dto.request.ProjectTemplateReq;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.dto.response.ProjectTemplateRes;

import java.util.List;

/**
 * NCL-05-CN-007: Tao du an tu mau co san cay hang muc, cong viec va ngan sach gio goi y.
 */
public interface ProjectTemplateService {

	/** Danh sach mau dang hoat dong de nguoi dung chon khi tao du an. */
	List<ProjectTemplateRes> findActiveTemplates();

	ProjectTemplateRes createTemplate(ProjectTemplateReq request);

	/**
	 * Tao du an moi tu mot mau: du an ke thua thong tin hop dong con hieu luc, cay hang muc
	 * va cong viec duoc sao chep gia tri tu mau (kem ngan sach gio goi y). Mau goc giu nguyen.
	 */
	ProjectRes createProjectFromTemplate(Long contractId, ProjectCreateFromTemplateReq request);
}
