package com.serviceops.modules.invoice.service;

import com.serviceops.modules.invoice.dto.request.DunningRunReq;
import com.serviceops.modules.invoice.dto.response.DunningLogRes;
import com.serviceops.modules.invoice.dto.response.DunningRunRes;

import java.util.List;

/** NCL-10-CN-006: nhắc thu nợ tự động (QTN-27). */
public interface DunningService {

	/**
	 * Rà soát toàn bộ hóa đơn còn công nợ (ISSUED/PARTIALLY_PAID, còn phải thu &gt; 0): hóa đơn còn
	 * đúng 3 ngày tới hạn (TC-01), đúng ngày hết hạn, hoặc đã quá hạn tại mốc 7/14/21… ngày thì gửi
	 * nhắc cho Kế toán và người phụ trách khách hàng — mỗi mốc chỉ nhắc một lần (TC-02).
	 */
	DunningRunRes run(DunningRunReq request);

	/**
	 * Lịch sử nhắc thu nợ của một hóa đơn, mới nhất trước.
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException RESOURCE_NOT_FOUND nếu không có hóa đơn
	 */
	List<DunningLogRes> history(Long invoiceId);
}
