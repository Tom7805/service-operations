package com.serviceops.modules.report.enums;

/** Báo cáo xuất được ra tệp (NCL-11-CN-004). Thêm loại mới khi báo cáo tương ứng có dữ liệu để xuất. */
public enum ReportType {

	/** NCL-11-CN-003 — Báo cáo hiệu quả theo dự án. */
	PROJECT_PERFORMANCE("Báo cáo hiệu quả theo dự án", "bao-cao-hieu-qua-du-an");

	private final String label;
	private final String fileSlug;

	ReportType(String label, String fileSlug) {
		this.label = label;
		this.fileSlug = fileSlug;
	}

	public String getLabel() {
		return label;
	}

	/** Phần đầu tên tệp, chỉ gồm ký tự ASCII để an toàn trên mọi hệ điều hành. */
	public String getFileSlug() {
		return fileSlug;
	}
}
