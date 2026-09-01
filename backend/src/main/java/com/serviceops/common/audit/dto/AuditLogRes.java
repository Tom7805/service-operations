package com.serviceops.common.audit.dto;

import com.serviceops.common.audit.AuditTargetType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Một bản ghi nhật ký thao tác tổng hợp trả về cho quản trị viên. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogRes {

	private Long id;
	private Long actorUserId;
	private String actorUsername;
	private String action;
	private AuditTargetType targetType;
	private Long targetId;
	private String targetLabel;
	private String detail;
	private LocalDateTime performedAt;
}
