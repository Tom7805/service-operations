package com.serviceops.modules.report.enums;

/** Định dạng tệp xuất báo cáo (NCL-11-CN-004). */
public enum ReportFormat {

	/** Bảng tính dạng CSV, mã hóa UTF-8 có BOM để Excel đọc đúng tiếng Việt. */
	CSV("text/csv; charset=UTF-8", "csv");

	private final String contentType;
	private final String extension;

	ReportFormat(String contentType, String extension) {
		this.contentType = contentType;
		this.extension = extension;
	}

	public String getContentType() {
		return contentType;
	}

	public String getExtension() {
		return extension;
	}
}
