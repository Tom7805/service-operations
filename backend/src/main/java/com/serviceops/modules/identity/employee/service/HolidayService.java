package com.serviceops.modules.identity.employee.service;

import com.serviceops.modules.identity.employee.dto.request.HolidayReq;
import com.serviceops.modules.identity.employee.dto.response.HolidayRes;

import java.time.LocalDate;
import java.util.List;

/** Lịch ngày nghỉ lễ — ngày lễ không tính vào giờ làm việc chuẩn (QTN-23) của các báo cáo tỷ lệ giờ tính phí. */
public interface HolidayService {

	List<HolidayRes> findAll();

	HolidayRes create(HolidayReq request);

	HolidayRes update(Long id, HolidayReq request);

	void delete(Long id);

	/** Các ngày lễ trong khoảng đã trải phẳng, để tính giờ chuẩn của cả báo cáo bằng một lần đọc. */
	HolidayCalendar calendarFor(LocalDate from, LocalDate to);
}
