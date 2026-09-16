package com.serviceops.modules.rate.service;

import com.serviceops.modules.rate.dto.request.BillRateCreateReq;
import com.serviceops.modules.rate.dto.response.BillRateRes;

import java.time.LocalDate;
import java.util.List;

public interface BillRateService {

	BillRateRes create(BillRateCreateReq request);

	/**
	 * Danh sach chuc danh dang co don gia ban hieu luc tinh den hom nay,
	 * sap xep theo ten — dung de dung o chon o man hinh lap bao gia
	 * (NCL-03-CN-003), tranh nguoi dung go tay sai ten khien khong tra
	 * duoc don gia.
	 */
	List<BillRateRes> listCurrentlyEffective();

	/**
	 * Tra dung dong don gia hieu luc tai mot ngay phat sinh cu the (NCL-07-CN-002, QTN-15) —
	 * dung de tinh doanh thu cho gio cong da ghi nhan trong qua khu ma khong bi anh huong boi
	 * lan tang gia sau do. Nem {@code RESOURCE_NOT_FOUND} neu vai tro/cap bac chua co dong
	 * don gia nao hieu luc truoc hoac dung {@code asOf}.
	 */
	BillRateRes resolve(String professionalRole, String level, LocalDate asOf);
}
