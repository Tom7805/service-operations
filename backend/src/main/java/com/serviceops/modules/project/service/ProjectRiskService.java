package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.request.ProjectRiskReq;
import com.serviceops.modules.project.dto.request.ProjectRiskStatusReq;
import com.serviceops.modules.project.dto.response.ProjectRiskRes;

import java.util.List;

/**
 * NCL-05-CN-009: quan ly rui ro cua du an.
 * Chi Quan ly du an (VT-02) duoc thao tac; diem/muc do rui ro tinh dong khi doc.
 */
public interface ProjectRiskService {

	/** TC-01: ghi nhan rui ro (mo ta, muc tac dong, kha nang xay ra, bien phap, nguoi theo doi). */
	ProjectRiskRes createRisk(Long projectId, ProjectRiskReq request);

	/** Cap nhat noi dung rui ro. */
	ProjectRiskRes updateRisk(Long projectId, Long riskId, ProjectRiskReq request);

	/** Cap nhat trang thai xu ly rui ro (OPEN/MITIGATING/CLOSED). */
	ProjectRiskRes changeStatus(Long projectId, Long riskId, ProjectRiskStatusReq request);

	/** Xoa rui ro. */
	void deleteRisk(Long projectId, Long riskId);

	/** TC-02: bang theo doi rui ro — sap theo diem rui ro giam dan, he thong tu tinh muc do. */
	List<ProjectRiskRes> getRisks(Long projectId);
}
