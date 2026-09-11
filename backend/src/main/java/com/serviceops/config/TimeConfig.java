package com.serviceops.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * Dong ho he thong duoc inject qua bean de cac nghiep vu theo ngay (VD moc tien do
 * NCL-05-CN-008 tinh trang thai cham) co the thay the trong unit test, tranh test
 * flaky theo ngay chay that.
 */
@Configuration
public class TimeConfig {

	@Bean
	public Clock clock() {
		return Clock.systemDefaultZone();
	}
}
