package com.serviceops.modules.opportunity.dto.request;

import java.time.LocalDate;

public record ForecastQueryReq(LocalDate from, LocalDate to) {

	public ForecastQueryReq {
		if (from != null && to != null && from.isAfter(to)) {
			throw new IllegalArgumentException("Khoang thoi gian loc khong hop le");
		}
	}
}
