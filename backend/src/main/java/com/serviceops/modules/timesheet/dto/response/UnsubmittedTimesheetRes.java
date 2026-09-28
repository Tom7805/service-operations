package com.serviceops.modules.timesheet.dto.response;

import java.time.LocalDate;

/**
 * NCL-06-CN-009: một nhân sự còn chưa nộp bảng chấm công của tuần được truy vấn.
 *
 * @param userName họ tên nhân sự, để hiển thị thay vì chỉ có mã số.
 */
public record UnsubmittedTimesheetRes(Long userId, String userName, LocalDate weekStartDate, LocalDate weekEndDate) {
}
