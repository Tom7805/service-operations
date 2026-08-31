package com.serviceops.common.audit.dto;

import com.serviceops.common.audit.AuditTargetType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

/** Bộ lọc tra cứu nhật ký thao tác tổng hợp — theo người thực hiện, loại đối tượng, hành động, thời gian. */
@Getter
@Setter
public class AuditLogSearchReq {

	private String actorUsername;

	private AuditTargetType targetType;

	/** Lọc theo hành động (tìm chứa, không phân biệt hoa thường). */
	private String action;

	@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
	private LocalDateTime from;

	@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
	private LocalDateTime to;

	@Min(0)
	private int page = 0;

	@Min(1)
	@Max(200)
	private int size = 20;
}
