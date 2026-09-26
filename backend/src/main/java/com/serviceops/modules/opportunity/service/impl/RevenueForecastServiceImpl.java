package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.opportunity.dto.request.ForecastQueryReq;
import com.serviceops.modules.opportunity.dto.response.RevenueForecastRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.RevenueForecastService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * NCL-03-CN-004: Du bao doanh thu theo xac suat giai doan (QTN-07).
 *
 * <p>Doanh thu du bao cua mot co hoi = gia tri du kien x xac suat giai doan hien tai; cong
 * don theo thang du kien ky (TC-01). Chi tinh co hoi con mo — co hoi da thang/thua bi loai
 * khoi du bao (TC-02). Chi lay co hoi trong pham vi du lieu cua nguoi xem (QTN-01). Moi lan
 * xem ghi mot dong nhat ky co hoi {@code FORECAST_VIEW} (TC-04) nen transaction la doc-ghi.</p>
 */
@Service
@Transactional
public class RevenueForecastServiceImpl implements RevenueForecastService {

	private final OpportunityRepository opportunityRepository;
	private final CustomerRepository customerRepository;
	private final OpportunityScopeGuard scopeGuard;
	private final OpportunityAuditLogger auditLogger;

	public RevenueForecastServiceImpl(OpportunityRepository opportunityRepository,
			CustomerRepository customerRepository, OpportunityScopeGuard scopeGuard,
			OpportunityAuditLogger auditLogger) {
		this.opportunityRepository = opportunityRepository;
		this.customerRepository = customerRepository;
		this.scopeGuard = scopeGuard;
		this.auditLogger = auditLogger;
	}

	@Override
	public RevenueForecastRes forecast(ForecastQueryReq query) {
		final Map<YearMonth, MonthlyAccumulator> byMonth = new TreeMap<>();
		for (Opportunity opportunity : scopeGuard.filter(opportunityRepository.findAll())) {
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
			accumulator.items.add(new OpportunityAccumulatorItem(opportunity, weightedRevenue));
		}

		// Lay ten khach hang theo lo cho tat ca co hoi cua moi thang, tranh N+1 query
		// (cung cach OpportunityServiceImpl.list() dang dung).
		Map<Long, String> customerNameById = customerRepository
				.findAllById(byMonth.values().stream()
						.flatMap(acc -> acc.items.stream())
						.map(item -> item.opportunity.getCustomerId())
						.filter(Objects::nonNull)
						.distinct()
						.toList())
				.stream()
				.collect(Collectors.toMap(Customer::getId, Customer::getName, (a, b) -> a));

		BigDecimal total = byMonth.values().stream()
				.map(accumulator -> accumulator.revenue)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		// TC-04: ghi nhat ky nguoi xem, noi dung (khoang loc, so thang, tong du bao) va thoi diem.
		int opportunityCount = byMonth.values().stream().mapToInt(acc -> acc.opportunityCount).sum();
		auditLogger.recordForecastView("Xem du bao doanh thu"
				+ " tu " + (query.from() == null ? "(khong gioi han)" : query.from())
				+ " den " + (query.to() == null ? "(khong gioi han)" : query.to())
				+ ": " + byMonth.size() + " thang, " + opportunityCount + " co hoi mo, tong "
				+ total.toPlainString());

		return new RevenueForecastRes(total, byMonth.entrySet().stream()
				.map(entry -> {
					MonthlyAccumulator accumulator = entry.getValue();
					List<RevenueForecastRes.OpportunityForecastItem> opportunities = accumulator.items.stream()
							// Cơ hội đóng góp nhiều nhất hiện lên trước khi bung chi tiết.
							.sorted(Comparator.comparing((OpportunityAccumulatorItem it) -> it.weightedRevenue).reversed())
							.map(it -> new RevenueForecastRes.OpportunityForecastItem(
									it.opportunity.getId(),
									it.opportunity.getName(),
									customerNameById.get(it.opportunity.getCustomerId()),
									it.opportunity.getExpectedValue(),
									it.opportunity.getProbability(),
									it.weightedRevenue,
									it.opportunity.getExpectedCloseDate()))
							.toList();
					return new RevenueForecastRes.MonthlyRevenueForecast(entry.getKey(), accumulator.revenue,
							accumulator.opportunityCount, opportunities);
				})
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
		private final List<OpportunityAccumulatorItem> items = new ArrayList<>();
	}

	private record OpportunityAccumulatorItem(Opportunity opportunity, BigDecimal weightedRevenue) {}
}
