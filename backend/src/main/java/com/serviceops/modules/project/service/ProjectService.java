package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.request.ProjectCreateFromContractReq;
import com.serviceops.modules.project.dto.response.ProjectRes;

import java.util.List;

public interface ProjectService {

	/** NCL-05-CN-001: tao du an tu hop dong dang con hieu luc. */
	ProjectRes createFromContract(Long contractId, ProjectCreateFromContractReq request);

	/**
	 * Doc thong tin mot du an (ten, trang thai, ngay, quan ly, hop dong) — phuc vu tieu de
	 * va viec khoa/mo nut chinh sua tren cac man hinh con cua du an (cong viec, moc, rui ro...).
	 */
	ProjectRes getProject(Long projectId);

	/** Danh sach du an thuoc mot hop dong, moi nhat truoc. */
	List<ProjectRes> listByContract(Long contractId);
}
