package com.serviceops.modules.timesheet.dto.response;

import java.time.LocalDate;

/** NCL-06-CN-009: một nhân sự còn chưa nộp bảng chấm công của tuần được truy vấn. */
public record UnsubmittedTimesheetRes(Long userId, LocalDate weekStartDate, LocalDate weekEndDate) {
}
