package com.serviceops.modules.opportunity.service;

import com.serviceops.modules.opportunity.dto.request.ActivityCreateReq;
import com.serviceops.modules.opportunity.dto.response.ActivityRes;

import java.util.List;

public interface OpportunityActivityService {

	/**
	 * Dong thoi gian cham soc cua mot co hoi, hoat dong moi nhat len dau
	 * (NCL-03-CN-006). Luon xem duoc du co hoi da dong hay chua (TC-02).
	 */
	List<ActivityRes> listByOpportunity(Long opportunityId);

	/**
	 * Ghi nhan mot hoat dong cham soc moi cho co hoi (NCL-03-CN-006, TC-01).
	 * Chi cho phep khi co hoi con dang mo — co hoi da dong thi bi tu choi
	 * (TC-02). Moi lan them thanh cong deu duoc ghi vao nhat ky co hoi (TC-04).
	 */
	ActivityRes addActivity(Long opportunityId, ActivityCreateReq request);
}
