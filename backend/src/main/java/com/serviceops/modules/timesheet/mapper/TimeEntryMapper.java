package com.serviceops.modules.timesheet.mapper;

import com.serviceops.modules.timesheet.dto.response.TimeEntryRes;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import org.springframework.stereotype.Component;

/**
 * Anh xa mot ban ghi gio cong ({@link TimeEntry}) sang ban ghi tra ve FE (NCL-06-CN-001).
 */
@Component
public class TimeEntryMapper {

	/**
	 * Anh xa mot ban ghi gio cong sang ban ghi tra ve FE.
	 */
	public TimeEntryRes toResponse(TimeEntry entry) {
		return new TimeEntryRes(
				entry.getId(),
				entry.getTaskId(),
				entry.getUserId(),
				entry.getWorkDate(),
				entry.getHours(),
				entry.getStatus(),
				entry.getNote(),
				entry.getCreatedAt()
		);
	}
}
