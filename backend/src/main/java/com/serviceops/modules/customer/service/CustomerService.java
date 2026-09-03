package com.serviceops.modules.customer.service;

import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.CustomerSearchReq;
import com.serviceops.modules.customer.dto.request.CustomerSegmentReq;
import com.serviceops.modules.customer.dto.request.CustomerUpdateReq;
import com.serviceops.modules.customer.dto.request.DuplicateOverrideReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;

import java.util.List;

public interface CustomerService {
	CustomerRes create(CustomerCreateReq request);

	/**
	 * NCL-02-CN-001 (buoc D/P): lay danh sach ho so khach hang hien co trong he thong,
	 * ho tro tim theo ten / ma KH / MST / SDT qua {@code request.keyword}.
	 * Chi Nhan vien kinh doanh (VT-04) va Quan ly du an (VT-02) duoc goi (QTN-01).
	 */
	List<CustomerRes> findAll(CustomerSearchReq request);

	CustomerRes updateSegment(Long customerId, CustomerSegmentReq request);

	/**
	 * Chinh sua thong tin ho so khach hang da ton tai (ten / MST / SDT / nganh / dia chi).
	 * Chay lai kiem tra chong trung nhu luong tao moi nhung loai chinh ho so dang sua ra khoi
	 * danh sach nghi trung. Chan khi ho so da bi gop (MERGED). Ghi Audit Log {@code UPDATE}.
	 */
	CustomerRes update(Long customerId, CustomerUpdateReq request);

	/**
	 * Chinh sua ho so khach hang bo qua canh bao trung, bat buoc kem ly do.
	 * Ghi log ly do va Audit Log {@code UPDATE_WITH_OVERRIDE}.
	 */
	CustomerRes updateWithOverride(Long customerId, CustomerUpdateReq request, DuplicateOverrideReq override);

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
