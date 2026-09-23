package com.serviceops.modules.invoice;

import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes.BucketRes;
import com.serviceops.modules.invoice.enums.AgingBucket;
import com.serviceops.modules.invoice.service.InvoiceService;
import com.serviceops.modules.invoice.service.impl.ReceivableServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Theo doi cong no qua han (NCL-10-CN-004): phan nhom theo so ngay qua han. */
@ExtendWith(MockitoExtension.class)
class ReceivableServiceTest {

	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
	private static final LocalDate TODAY = LocalDate.of(2026, 9, 21);

	@Mock
	private InvoiceService invoiceService;

	private ReceivableServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ReceivableServiceImpl(invoiceService,
				Clock.fixed(Instant.parse("2026-09-21T03:00:00Z"), ZONE));
	}

	@Test
	@DisplayName("NCL-10-CN-004-TC-01: hoa don qua han 40 ngay nam trong nhom qua han tren 30 ngay (31-60)")
	void placesInvoiceOverdueFortyDaysInTheOverThirtyDaysBucket() {
		when(invoiceService.listOverdue(TODAY, null))
				.thenReturn(List.of(overdue(9L, TODAY.minusDays(40), "100000000.00", "40000000.00")));

		ReceivableAgingRes res = service.getOverdue(null, null);

		assertThat(res.asOfDate()).isEqualTo(TODAY);
		assertThat(res.totalInvoiceCount()).isEqualTo(1);
		assertThat(res.totalRemainingAmount()).isEqualByComparingTo("60000000.00");
		BucketRes bucket = bucket(res, AgingBucket.DAYS_31_60);
		assertThat(bucket.invoiceCount()).isEqualTo(1);
		assertThat(bucket.remainingAmount()).isEqualByComparingTo("60000000.00");
		assertThat(bucket.invoices()).singleElement().satisfies(item -> {
			assertThat(item.id()).isEqualTo(9L);
			assertThat(item.daysOverdue()).isEqualTo(40);
			assertThat(item.dueDate()).isEqualTo(TODAY.minusDays(40));
			assertThat(item.customerName()).isEqualTo("Cong ty A");
			assertThat(item.remainingAmount()).isEqualByComparingTo("60000000.00");
		});
		assertThat(bucket(res, AgingBucket.DAYS_1_30).invoices()).isEmpty();
	}

	@Test
	@DisplayName("NCL-10-CN-004-TC-02: khong co hoa don qua han -> tong bang 0 va du bon nhom deu rong")
	void returnsZeroTotalsAndFourEmptyBucketsWhenNothingIsOverdue() {
		when(invoiceService.listOverdue(TODAY, null)).thenReturn(List.of());

		ReceivableAgingRes res = service.getOverdue(null, null);

		assertThat(res.totalInvoiceCount()).isZero();
		assertThat(res.totalRemainingAmount()).isEqualByComparingTo("0");
		assertThat(res.buckets()).extracting(BucketRes::bucket)
				.containsExactly("DAYS_1_30", "DAYS_31_60", "DAYS_61_90", "OVER_90");
		assertThat(res.buckets()).allSatisfy(b -> {
			assertThat(b.invoiceCount()).isZero();
			assertThat(b.invoices()).isEmpty();
			assertThat(b.remainingAmount()).isEqualByComparingTo("0");
		});
	}

	@Test
	void splitsInvoicesAtBucketBoundaries() {
		when(invoiceService.listOverdue(TODAY, null)).thenReturn(List.of(
				overdue(1L, TODAY.minusDays(1), "10.00", "0.00"),
				overdue(2L, TODAY.minusDays(30), "10.00", "0.00"),
				overdue(3L, TODAY.minusDays(31), "10.00", "0.00"),
				overdue(4L, TODAY.minusDays(60), "10.00", "0.00"),
				overdue(5L, TODAY.minusDays(61), "10.00", "0.00"),
				overdue(6L, TODAY.minusDays(90), "10.00", "0.00"),
				overdue(7L, TODAY.minusDays(91), "10.00", "0.00")));

		ReceivableAgingRes res = service.getOverdue(null, null);

		assertThat(ids(res, AgingBucket.DAYS_1_30)).containsExactly(1L, 2L);
		assertThat(ids(res, AgingBucket.DAYS_31_60)).containsExactly(3L, 4L);
		assertThat(ids(res, AgingBucket.DAYS_61_90)).containsExactly(5L, 6L);
		assertThat(ids(res, AgingBucket.OVER_90)).containsExactly(7L);
		assertThat(res.totalInvoiceCount()).isEqualTo(7);
		assertThat(res.totalRemainingAmount()).isEqualByComparingTo("70.00");
	}

	@Test
	void keepsMostOverdueFirstWithinABucketAndSumsRemainingPerBucket() {
		when(invoiceService.listOverdue(TODAY, null)).thenReturn(List.of(
				overdue(1L, TODAY.minusDays(45), "100.00", "20.00"),
				overdue(2L, TODAY.minusDays(35), "50.00", "0.00")));

		BucketRes bucket = bucket(service.getOverdue(null, null), AgingBucket.DAYS_31_60);

		assertThat(bucket.invoices()).extracting(i -> i.id()).containsExactly(1L, 2L);
		assertThat(bucket.remainingAmount()).isEqualByComparingTo("130.00");
	}

	@Test
	void bucketFilterKeepsOnlyThatBucketAndTotalsFollowTheFilter() {
		when(invoiceService.listOverdue(TODAY, 3L)).thenReturn(List.of(
				overdue(1L, TODAY.minusDays(10), "100.00", "0.00"),
				overdue(2L, TODAY.minusDays(100), "200.00", "0.00")));

		ReceivableAgingRes res = service.getOverdue(3L, AgingBucket.OVER_90);

		verify(invoiceService).listOverdue(TODAY, 3L);
		assertThat(res.totalInvoiceCount()).isEqualTo(1);
		assertThat(res.totalRemainingAmount()).isEqualByComparingTo("200.00");
		assertThat(ids(res, AgingBucket.OVER_90)).containsExactly(2L);
		assertThat(bucket(res, AgingBucket.DAYS_1_30).invoices()).isEmpty();
	}

	@Test
	void reportsBucketRangesForTheScreen() {
		when(invoiceService.listOverdue(TODAY, null)).thenReturn(List.of());

		List<BucketRes> buckets = service.getOverdue(null, null).buckets();

		assertThat(buckets.get(0).fromDays()).isEqualTo(1);
		assertThat(buckets.get(0).toDays()).isEqualTo(30);
		assertThat(buckets.get(3).fromDays()).isEqualTo(91);
		assertThat(buckets.get(3).toDays()).isNull();
	}

	// ---------- du lieu ----------

	private BucketRes bucket(ReceivableAgingRes res, AgingBucket bucket) {
		return res.buckets().stream().filter(b -> b.bucket().equals(bucket.name())).findFirst().orElseThrow();
	}

	private List<Long> ids(ReceivableAgingRes res, AgingBucket bucket) {
		return bucket(res, bucket).invoices().stream().map(i -> i.id()).toList();
	}

	private InvoiceDetailRes overdue(Long id, LocalDate dueDate, String total, String paid) {
		BigDecimal totalAmount = new BigDecimal(total);
		BigDecimal paidAmount = new BigDecimal(paid);
		return new InvoiceDetailRes(id, "INV-" + id, 5L, "HD-TEST", 3L, "Cong ty A",
				paidAmount.signum() > 0 ? "PARTIALLY_PAID" : "ISSUED", totalAmount, paidAmount,
				totalAmount.subtract(paidAmount), dueDate.minusDays(30), dueDate, null, "ketoan01",
				LocalDateTime.of(2026, 7, 1, 10, 0));
	}
}
