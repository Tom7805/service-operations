package com.serviceops.modules.identity.department.service;

import com.serviceops.modules.identity.department.dto.request.DepartmentCreateReq;
import com.serviceops.modules.identity.department.dto.request.DepartmentMoveReq;
import com.serviceops.modules.identity.department.dto.request.DepartmentUpdateReq;
import com.serviceops.modules.identity.department.dto.response.DepartmentRes;
import com.serviceops.modules.identity.department.dto.response.DepartmentTreeRes;

import java.util.List;
import java.util.Set;

public interface DepartmentService {
	List<DepartmentRes> findAll(String keyword);
	List<DepartmentTreeRes> findTree();
	DepartmentRes findById(Long id);
	DepartmentRes create(DepartmentCreateReq request);
	DepartmentRes update(Long id, DepartmentUpdateReq request);
	DepartmentRes move(Long id, DepartmentMoveReq request);
	void delete(Long id);

	/** Tra ve id cua bo phan va toan bo bo phan con chau (dung cho pham vi du lieu QTN-01). */
	Set<Long> collectDescendantIds(Long departmentId);
}
