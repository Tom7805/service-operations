package com.serviceops.modules.customer.service;

import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.DuplicateOverrideReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;

import java.util.List;

public interface CustomerService {
	CustomerRes create(CustomerCreateReq request);

	/**
	 * Kiem tra ho so moi co nghi trung voi ho so da co khong (NCL-02-CN-002).
	 * Tra ve danh sach ho so nghi trung (TC-01, TC-03) va chan neu co ho so giong cao.
	 */
	List<DuplicateCandidateRes> checkDuplicates(CustomerCreateReq request);

	/**
	 * Xac nhan tao moi ho so khach hang bo qua canh bao trung, bat buoc kem ly do (TC-02).
	 * Ghi nhan log ly do (TC-05).
	 */
	CustomerRes createWithOverride(CustomerCreateReq request, DuplicateOverrideReq override);
}
