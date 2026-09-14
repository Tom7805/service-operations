package com.serviceops.modules.rate.service;

import com.serviceops.modules.rate.dto.response.BillRateRes;

import java.util.List;

public interface BillRateService {

	/**
	 * Danh sach chuc danh dang co don gia ban hieu luc tinh den hom nay,
	 * sap xep theo ten — dung de dung o chon o man hinh lap bao gia
	 * (NCL-03-CN-003), tranh nguoi dung go tay sai ten khien khong tra
	 * duoc don gia.
	 */
	List<BillRateRes> listCurrentlyEffective();
}
