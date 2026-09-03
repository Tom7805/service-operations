package com.serviceops.modules.opportunity.service;

import com.serviceops.modules.opportunity.dto.request.ForecastQueryReq;
import com.serviceops.modules.opportunity.dto.response.RevenueForecastRes;

public interface RevenueForecastService {

	RevenueForecastRes forecast(ForecastQueryReq query);
}
