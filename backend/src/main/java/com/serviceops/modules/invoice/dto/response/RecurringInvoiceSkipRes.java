package com.serviceops.modules.invoice.dto.response;

/**
 * NCL-10-CN-005 (TC-02): mot dieu khoan dinh ky den ngay lap nhung KHONG duoc sinh hoa don,
 * kem ly do de Ke toan kiem tra (vd hop dong het hieu luc, can gia han).
 */
public record RecurringInvoiceSkipRes(Long contractId, String reason) {
}
