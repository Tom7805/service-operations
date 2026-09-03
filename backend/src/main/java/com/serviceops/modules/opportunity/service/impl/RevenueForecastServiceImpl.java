package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.opportunity.dto.request.ForecastQueryReq;
import com.serviceops.modules.opportunity.dto.response.RevenueForecastRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.RevenueForecastService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.Map;
import java.util.TreeMap;

@Service
@Transactional(readOnly = true)
public class RevenueForecastServiceImpl implements RevenueForecastService {

	private final OpportunityRepository opportunityRepository;

	public RevenueForecastServiceImpl(OpportunityRepository opportunityRepository) {
		this.opportunityRepository = opportunityRepository;
	}

	@Override
	public RevenueForecastRes forecast(ForecastQueryReq query) {
		final Map<YearMonth, MonthlyAccumulator> byMonth = new TreeMap<>();
		for (Opportunity opportunity : opportunityRepository.findAll()) {
			if (opportunity.getStatus() != OpportunityStatus.OPEN
					|| opportunity.getExpectedCloseDate() == null) {
				continue;
			}

			YearMonth month = YearMonth.from(opportunity.getExpectedCloseDate());
			if (!isInRange(month, query)) {
				continue;
			}

			BigDecimal probability = opportunity.getProbability() == null
					? BigDecimal.ZERO : opportunity.getProbability();
			BigDecimal expectedValue = opportunity.getExpectedValue() == null
					? BigDecimal.ZERO : opportunity.getExpectedValue();
			BigDecimal weightedRevenue = expectedValue.multiply(probability)
					.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
			MonthlyAccumulator accumulator = byMonth.computeIfAbsent(month, ignored -> new MonthlyAccumulator());
			accumulator.revenue = accumulator.revenue.add(weightedRevenue);
			accumulator.opportunityCount++;
		}

		BigDecimal total = byMonth.values().stream()
				.map(accumulator -> accumulator.revenue)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		return new RevenueForecastRes(total, byMonth.entrySet().stream()
				.map(entry -> new RevenueForecastRes.MonthlyRevenueForecast(entry.getKey(), entry.getValue().revenue,
						entry.getValue().opportunityCount))
				.toList());
	}

	private boolean isInRange(YearMonth month, ForecastQueryReq query) {
		if (query.from() != null && month.isBefore(YearMonth.from(query.from()))) {
			return false;
		}
		return query.to() == null || !month.isAfter(YearMonth.from(query.to()));
	}

	private static final class MonthlyAccumulator {
		private BigDecimal revenue = BigDecimal.ZERO;
		private int opportunityCount;
	}
}
