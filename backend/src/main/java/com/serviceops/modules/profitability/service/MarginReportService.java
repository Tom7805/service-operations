package com.serviceops.modules.profitability.service;

import com.serviceops.modules.profitability.dto.request.ProfitQueryReq;
import com.serviceops.modules.profitability.dto.response.MarginByCustomerRes;
import com.serviceops.modules.profitability.dto.response.MarginByEmployeeRes;

/**
 * Báo cáo biên lợi nhuận theo khách hàng và theo nhân sự (NCL-09-CN-005).
 *
 * <p>Gộp doanh thu ghi nhận (QTN-15/16) và giá vốn giờ công (QTN-17) của mọi dòng giờ công ĐÃ DUYỆT
 * trong kỳ, theo hai chiều phân tích: khách hàng (qua dự án) và nhân sự thực hiện.</p>
 */
public interface MarginReportService {

	/** NCL-09-CN-005-TC-01: bảng biên lợi nhuận gộp theo từng khách hàng trong kỳ. */
	MarginByCustomerRes marginByCustomer(ProfitQueryReq period);

	/** NCL-09-CN-005-TC-02: bảng biên lợi nhuận gộp theo từng nhân sự trong kỳ. */
	MarginByEmployeeRes marginByEmployee(ProfitQueryReq period);
}
