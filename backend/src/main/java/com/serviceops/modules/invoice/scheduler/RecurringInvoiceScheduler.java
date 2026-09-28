package com.serviceops.modules.invoice.scheduler;

import com.serviceops.modules.invoice.dto.request.RecurringInvoiceRunReq;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceRunRes;
import com.serviceops.modules.invoice.service.RecurringInvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * NCL-10-CN-005: moi ngay ra soat cac dieu khoan lap hoa don dinh ky den ngay trong thang, tu
 * dong tao hoa don nhap cho Ke toan soat lai (TC-01). Chay luc 06h00 (gio server) hang ngay —
 * truoc gio lam viec de hoa don nhap san sang khi Ke toan vao ca.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RecurringInvoiceScheduler {

	private final RecurringInvoiceService recurringInvoiceService;

	@Scheduled(cron = "0 0 6 * * *")
	public void runDaily() {
		RecurringInvoiceRunRes result = recurringInvoiceService.run(new RecurringInvoiceRunReq(null));
		log.info("Ra soat hoa don dinh ky ngay {}: da lap {} hoa don, bo qua {} hop dong",
				result.asOf(), result.created().size(), result.skipped().size());
	}
}
