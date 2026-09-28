package com.serviceops.modules.invoice.service.impl;

import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes.BucketRes;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes.ItemRes;
import com.serviceops.modules.invoice.enums.AgingBucket;
import com.serviceops.modules.invoice.service.InvoiceService;
import com.serviceops.modules.invoice.service.ReceivableService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReceivableServiceImpl implements ReceivableService {

	private final InvoiceService invoiceService;
	private final Clock clock;

	@Override
	public ReceivableAgingRes getOverdue(Long customerId, AgingBucket bucketFilter) {
		LocalDate today = LocalDate.now(clock);
		Map<AgingBucket, List<ItemRes>> byBucket = new EnumMap<>(AgingBucket.class);
		for (AgingBucket bucket : AgingBucket.values()) {
			byBucket.put(bucket, new ArrayList<>());
		}

		// listOverdue da sap qua han lau nhat truoc nen thu tu nay duoc giu trong tung nhom.
		for (InvoiceDetailRes invoice : invoiceService.listOverdue(today, customerId)) {
			long daysOverdue = ChronoUnit.DAYS.between(invoice.dueDate(), today);
			AgingBucket bucket = AgingBucket.of(daysOverdue);
			if (bucketFilter != null && bucketFilter != bucket) {
				continue;
			}
			byBucket.get(bucket).add(new ItemRes(invoice.id(), invoice.invoiceCode(), invoice.contractId(),
					invoice.contractCode(), invoice.customerId(), invoice.customerName(), invoice.status(),
					invoice.totalAmount(), invoice.paidAmount(), invoice.remainingAmount(), invoice.invoiceDate(),
					invoice.dueDate(), daysOverdue));
		}

		List<BucketRes> buckets = new ArrayList<>();
		int totalCount = 0;
		BigDecimal totalRemaining = BigDecimal.ZERO.setScale(2);
		for (AgingBucket bucket : AgingBucket.values()) {
			List<ItemRes> items = byBucket.get(bucket);
			BigDecimal remaining = items.stream().map(ItemRes::remainingAmount)
					.reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
			buckets.add(new BucketRes(bucket.name(), bucket.getLabel(), bucket.getFromDays(), bucket.getToDays(),
					items.size(), remaining, items));
			totalCount += items.size();
			totalRemaining = totalRemaining.add(remaining);
		}
		return new ReceivableAgingRes(today, totalCount, totalRemaining, buckets);
	}
}
