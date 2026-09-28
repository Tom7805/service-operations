package com.serviceops.common.audit.dto;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogPageRes {
	private List<AuditLogRes> content;
	private int page;
	private int size;
	private long totalElements;
	private int totalPages;
}
