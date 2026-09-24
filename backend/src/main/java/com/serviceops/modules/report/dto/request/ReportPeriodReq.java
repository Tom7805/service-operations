package com.serviceops.modules.report.dto.request;

import java.time.LocalDate;

/** Kỳ báo cáo theo khoảng ngày, gồm cả hai đầu. */
public record ReportPeriodReq(LocalDate from, LocalDate to) {
}
