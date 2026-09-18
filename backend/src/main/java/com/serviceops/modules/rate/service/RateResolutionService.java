package com.serviceops.modules.rate.service;

import com.serviceops.modules.rate.dto.request.RateLookupReq;
import com.serviceops.modules.rate.dto.response.ResolvedRateRes;

public interface RateResolutionService {

	/**
	 * Tra cuu don gia ap dung cho dong gio cong {@code timeEntryId} (NCL-07-CN-005).
	 *
	 * <p>Suy ra {@code professionalRole} tu ho so nhan su thuc hien dong gio cong,
	 * {@code contractId} tu cong viec &rarr; du an cua dong, va {@code asOf} tu chinh
	 * {@code workDate} cua dong — roi uy quyen cho {@link ContractBillRateService#resolve}
	 * de ap dung quy tac uu tien don gia hop dong (QTN-16). Nem {@code RESOURCE_NOT_FOUND}
	 * neu khong tim thay dong gio cong / cong viec / du an / ho so nhan su tuong ung, hoac
	 * chua co don gia nao (chung hoac rieng hop dong) hieu luc truoc hoac dung ngay cong.</p>
	 */
	ResolvedRateRes resolveForTimeEntry(Long timeEntryId, RateLookupReq request);

	/**
	 * Tu dong tra don gia ap dung cho dong gio cong {@code timeEntryId} — dung cho cac luong
	 * tinh toan hang loat khong co nguoi dung ngoi nhap {@code level} tung dong (vi du
	 * NCL-09-CN-002, tinh doanh thu ghi nhan cho ca du an).
	 *
	 * <p>Khac voi {@link #resolveForTimeEntry(Long, RateLookupReq)} (NCL-07-CN-005, tra cuu
	 * don le tren man hinh Ke toan, {@code level} do Frontend nhap tay vi luc do ho so nhan
	 * su chua luu cap bac) — phuong thuc nay lay {@code level} truc tiep tu
	 * {@code Employee.level} (bo sung rieng cho muc tu dong hoa nay). Nem
	 * {@code VALIDATION_ERROR} neu nhan su thuc hien dong gio cong do chua duoc khai bao
	 * cap bac trong ho so nhan su.</p>
	 */
	ResolvedRateRes resolveForTimeEntry(Long timeEntryId);
}
