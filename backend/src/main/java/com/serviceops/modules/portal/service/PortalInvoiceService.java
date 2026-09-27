package com.serviceops.modules.portal.service;

import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.portal.dto.response.PortalDebtSummaryRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceDetailRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceRes;

import java.util.List;

/** NCL-13-CN-004: khach hang xem hoa don va cong no cua chinh minh tren cong (QTN-26). */
public interface PortalInvoiceService {

	List<PortalInvoiceRes> list(InvoiceStatus status, Boolean overdueOnly);

	PortalDebtSummaryRes summary();

	PortalInvoiceDetailRes get(Long invoiceId);
}
