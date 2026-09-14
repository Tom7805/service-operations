package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.request.ProjectMilestoneCompleteReq;
import com.serviceops.modules.project.dto.request.ProjectMilestoneReq;
import com.serviceops.modules.project.dto.response.ProjectMilestoneRes;

import java.util.List;

/**
 * NCL-05-CN-008: quan ly moc tien do cua du an.
 * Chi Quan ly du an (VT-02) duoc thao tac; trang thai dung han/cham tinh dong khi doc.
 */
public interface ProjectMilestoneService {

	/** TC-01: tao moc tien do (ten, ngay ke hoach, hang muc phai hoan thanh). */
	ProjectMilestoneRes createMilestone(Long projectId, ProjectMilestoneReq request);

	/** Cap nhat ten, mo ta, ngay ke hoach va danh sach hang muc cua moc. */
	ProjectMilestoneRes updateMilestone(Long projectId, Long milestoneId, ProjectMilestoneReq request);

	/** Ghi nhan ngay thuc te hoan thanh cua moc (moc chuyen sang DONE). */
	ProjectMilestoneRes completeMilestone(Long projectId, Long milestoneId, ProjectMilestoneCompleteReq request);

	/** Xoa moc tien do. */
	void deleteMilestone(Long projectId, Long milestoneId);

	/** TC-02: danh sach moc tien do, he thong tu ra soat va danh dau dung han/cham. */
	List<ProjectMilestoneRes> getMilestones(Long projectId);
}
