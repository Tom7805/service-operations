package com.serviceops.modules.invoice.service;

import com.serviceops.modules.invoice.dto.request.RecurringInvoiceRunReq;
import com.serviceops.modules.invoice.dto.request.RecurringScheduleReq;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceRunRes;
import com.serviceops.modules.invoice.dto.response.RecurringScheduleRes;

/** NCL-10-CN-005: hoa don dinh ky cho hop dong duy tri (QTN-19). */
public interface RecurringInvoiceService {

	/** Khai bao dieu khoan lap hoa don dinh ky cho mot hop dong duy tri (MAINTENANCE). */
	RecurringScheduleRes createSchedule(Long contractId, RecurringScheduleReq request);

	/** Cap nhat dieu khoan da khai bao (ngay lap, gia tri, bat/tat). */
	RecurringScheduleRes updateSchedule(Long contractId, RecurringScheduleReq request);

	RecurringScheduleRes getSchedule(Long contractId);

	/**
	 * Ra soat toan bo dieu khoan dang hieu luc: dieu khoan nao den dung ngay lap trong thang
	 * (TC-01) va chua sinh cho ky nay thi tao hoa don nhap; hop dong da het hieu luc thi bo qua
	 * va nhac kiem tra gia han (TC-02).
	 */
	RecurringInvoiceRunRes run(RecurringInvoiceRunReq request);
}
