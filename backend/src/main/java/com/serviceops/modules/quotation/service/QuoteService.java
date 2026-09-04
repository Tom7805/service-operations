package com.serviceops.modules.quotation.service;

import com.serviceops.modules.quotation.dto.request.QuoteCreateReq;
import com.serviceops.modules.quotation.dto.response.QuoteRes;

public interface QuoteService {

	QuoteRes create(Long opportunityId, QuoteCreateReq request);
}