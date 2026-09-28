package com.serviceops.modules.invoice.service;

import com.serviceops.modules.invoice.dto.request.PaymentCreateReq;
import com.serviceops.modules.invoice.dto.response.PaymentRes;

public interface PaymentService {

	/**
	 * Ghi nhan mot lan khach hang thanh toan cho hoa don (NCL-10-CN-003).
	 *
	 * <p>Cap nhat trang thai hoa don trong cung giao dich: thu du thi {@code PAID}, con thieu thi
	 * {@code PARTIALLY_PAID}. Thao tac duoc ghi Nhat ky he thong.</p>
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException
	 *         RESOURCE_NOT_FOUND neu khong co hoa don; INVALID_STATE neu hoa don chua phat hanh
	 *         (DRAFT), da huy hoac da thanh toan du; VALIDATION_ERROR neu ngay thanh toan o tuong lai
	 *         hoac so tien lon hon so con phai thu
	 */
	PaymentRes recordPayment(Long invoiceId, PaymentCreateReq request);
}
