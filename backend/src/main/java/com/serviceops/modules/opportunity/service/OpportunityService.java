package com.serviceops.modules.opportunity.service;

import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;

import java.util.List;

public interface OpportunityService {

	/**
	 * Lay danh sach toan bo co hoi ban hang, moi nhat len truoc (NCL-03-CN-001).
	 * Dung cho man hinh Quan ly co hoi ban hang de tai lai du lieu tu may chu.
	 *
	 * @return danh sach co hoi kem ten khach hang de hien thi.
	 */
	List<OpportunityRes> list();

	/**
	 * Tao co hoi ban hang moi (NCL-03-CN-001, TC-01/TC-02/TC-04).
	 *
	 * @param request du lieu tao co hoi (ten, khach hang, gia tri du kien, ...).
	 * @return co hoi da luu, o giai doan dau tien (APPROACH).
	 */
	OpportunityRes create(OpportunityCreateReq request);
}
