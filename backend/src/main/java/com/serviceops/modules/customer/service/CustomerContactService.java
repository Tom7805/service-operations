package com.serviceops.modules.customer.service;

import com.serviceops.modules.customer.dto.request.CustomerContactReq;
import com.serviceops.modules.customer.dto.response.CustomerContactRes;

import java.util.List;

public interface CustomerContactService {

	/** Danh sach nguoi lien he cua mot khach hang, dau moi chinh hien o dau danh sach (TC-01). */
	List<CustomerContactRes> listByCustomer(Long customerId);

	/**
	 * Them nguoi lien he moi cho khach hang (NCL-02-CN-003, TC-01).
	 * Neu danh dau la dau moi chinh va khach hang da co dau moi chinh khac,
	 * nguoi cu tu dong chuyen thanh dau moi phu, chi giu duy nhat mot dau moi chinh (TC-02).
	 */
	CustomerContactRes addContact(Long customerId, CustomerContactReq request);

	/**
	 * Danh dau mot nguoi lien he da co san la dau moi chinh, chuyen dau moi chinh
	 * hien tai (neu co va khac nguoi nay) thanh dau moi phu (TC-02).
	 */
	CustomerContactRes setPrimary(Long customerId, Long contactId);
}
