package com.serviceops.modules.report.dto.response;

/** Tệp báo cáo đã dựng xong (NCL-11-CN-004): tên tệp, kiểu nội dung, nội dung và số dòng dữ liệu. */
public record ReportFileRes(String fileName, String contentType, byte[] content, int rowCount) {
}
