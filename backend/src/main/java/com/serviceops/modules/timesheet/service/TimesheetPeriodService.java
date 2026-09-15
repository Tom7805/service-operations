package com.serviceops.modules.timesheet.service;

import com.serviceops.modules.timesheet.dto.request.PeriodLockReq;
import com.serviceops.modules.timesheet.dto.response.TimesheetPeriodRes;

import java.util.List;

/**
 * NCL-06-CN-006: khoa/mo ky cham cong (QTN-12).
 *
 * <p>Chi Ke toan ({@code VT-05}) duoc thao tac. Khoa ky chan moi thao tac them, sua va dao gio
 * cong thuoc ky do ({@link com.serviceops.modules.timesheet.validator.PeriodLockValidator}).</p>
 */
public interface TimesheetPeriodService {

	/** Toan bo ky cham cong, moi nhat truoc. */
	List<TimesheetPeriodRes> findAll();

	/**
	 * Khoa ky cham cong cua mot thang — tao ky moi neu chua ton tai. Chan khi con bang cham
	 * cong chua duyet trong ky (TC-02).
	 */
	TimesheetPeriodRes lock(PeriodLockReq request);

	/** Mo lai mot ky da khoa. */
	TimesheetPeriodRes unlock(Long periodId);
}
