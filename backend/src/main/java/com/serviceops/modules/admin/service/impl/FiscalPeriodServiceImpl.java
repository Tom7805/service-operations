package com.serviceops.modules.admin.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.dto.response.FiscalPeriodRes;
import com.serviceops.modules.admin.service.CompanySettingService;
import com.serviceops.modules.admin.service.FiscalPeriodService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * NCL-15-CN-002-TC-01: chia nam tai chinh theo thang bat dau doc tu cau hinh cong ty — doi cau hinh la ap dung
 * ngay cho lan tinh ke tiep (khong luu san ky nao nen khong co du lieu cu can dong bo lai).
 */
@Service
@RequiredArgsConstructor
public class FiscalPeriodServiceImpl implements FiscalPeriodService {

	static final int MIN_YEAR = 2000;
	static final int MAX_YEAR = 2100;

	private final CompanySettingService companySettingService;
	private final Clock clock;

	@Override
	public FiscalPeriodRes getFiscalYear(int fiscalYear) {
		if (fiscalYear < MIN_YEAR || fiscalYear > MAX_YEAR) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Nam tai chinh phai trong khoang " + MIN_YEAR + " - " + MAX_YEAR);
		}
		return build(fiscalYear, companySettingService.fiscalYearStartMonth());
	}

	@Override
	public FiscalPeriodRes resolve(LocalDate date) {
		LocalDate day = date == null ? LocalDate.now(clock) : date;
		int startMonth = companySettingService.fiscalYearStartMonth();
		int fiscalYear = day.getMonthValue() >= startMonth ? day.getYear() : day.getYear() - 1;
		return build(fiscalYear, startMonth);
	}

	static FiscalPeriodRes build(int fiscalYear, int startMonth) {
		YearMonth first = YearMonth.of(fiscalYear, startMonth);
		List<FiscalPeriodRes.Month> months = new ArrayList<>(12);
		for (int i = 0; i < 12; i++) {
			YearMonth month = first.plusMonths(i);
			months.add(new FiscalPeriodRes.Month(i + 1, month.toString(), month.atDay(1), month.atEndOfMonth()));
		}
		List<FiscalPeriodRes.Quarter> quarters = new ArrayList<>(4);
		for (int q = 0; q < 4; q++) {
			quarters.add(new FiscalPeriodRes.Quarter(q + 1, months.get(q * 3).startDate(),
					months.get(q * 3 + 2).endDate()));
		}
		return new FiscalPeriodRes(fiscalYear, startMonth, months.get(0).startDate(), months.get(11).endDate(),
				quarters, months);
	}
}
