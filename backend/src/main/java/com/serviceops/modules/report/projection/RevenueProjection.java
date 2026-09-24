package com.serviceops.modules.report.projection;

import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.timesheet.entity.TimeEntry;

/** Một dòng giờ công đã duyệt, tính phí kèm hợp đồng của dự án chứa nó (NCL-11-CN-005). */
public record RevenueProjection(TimeEntry entry, Long contractId, ContractType contractType) {
}
