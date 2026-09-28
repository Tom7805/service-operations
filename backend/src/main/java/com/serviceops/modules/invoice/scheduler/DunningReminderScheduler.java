package com.serviceops.modules.invoice.scheduler;

import com.serviceops.modules.invoice.dto.request.DunningRunReq;
import com.serviceops.modules.invoice.dto.response.DunningRunRes;
import com.serviceops.modules.invoice.service.DunningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * NCL-10-CN-006: mỗi ngày rà soát toàn bộ hóa đơn còn công nợ và gửi nhắc thu nợ đúng mốc (trước
 * hạn 3 ngày, đúng hạn, hoặc quá hạn theo chu kỳ 7 ngày). Chạy lúc 07h00 (giờ server) hằng ngày —
 * sau giờ chạy hóa đơn định kỳ ({@link com.serviceops.modules.invoice.scheduler.RecurringInvoiceScheduler})
 * để không bỏ sót hóa đơn vừa được lập nhưng đã sát hạn.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DunningReminderScheduler {

	private final DunningService dunningService;

	@Scheduled(cron = "0 0 7 * * *")
	public void runDaily() {
		DunningRunRes result = dunningService.run(new DunningRunReq(null));
		log.info("Ra soat nhac thu no ngay {}: da nhac {} hoa don, bo qua {} hoa don da nhac truoc do",
				result.asOf(), result.sent().size(), result.skippedAlreadySentCount());
	}
}
