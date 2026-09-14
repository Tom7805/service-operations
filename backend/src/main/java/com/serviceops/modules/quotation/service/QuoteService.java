package com.serviceops.modules.quotation.service;

import com.serviceops.modules.quotation.dto.request.QuoteCreateReq;
import com.serviceops.modules.quotation.dto.response.QuoteRes;

import java.util.List;

public interface QuoteService {

	QuoteRes create(Long opportunityId, QuoteCreateReq request);

	List<QuoteRes> getHistory(Long opportunityId);
}