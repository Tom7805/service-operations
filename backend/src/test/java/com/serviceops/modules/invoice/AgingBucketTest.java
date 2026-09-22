package com.serviceops.modules.invoice;

import com.serviceops.modules.invoice.enums.AgingBucket;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AgingBucketTest {

	@Test
	void mapsDaysOverdueToBucketsIncludingBoundaries() {
		assertThat(AgingBucket.of(1)).isEqualTo(AgingBucket.DAYS_1_30);
		assertThat(AgingBucket.of(30)).isEqualTo(AgingBucket.DAYS_1_30);
		assertThat(AgingBucket.of(31)).isEqualTo(AgingBucket.DAYS_31_60);
		assertThat(AgingBucket.of(40)).isEqualTo(AgingBucket.DAYS_31_60);
		assertThat(AgingBucket.of(60)).isEqualTo(AgingBucket.DAYS_31_60);
		assertThat(AgingBucket.of(61)).isEqualTo(AgingBucket.DAYS_61_90);
		assertThat(AgingBucket.of(90)).isEqualTo(AgingBucket.DAYS_61_90);
		assertThat(AgingBucket.of(91)).isEqualTo(AgingBucket.OVER_90);
		assertThat(AgingBucket.of(3650)).isEqualTo(AgingBucket.OVER_90);
	}

	@Test
	void rejectsInvoicesThatAreNotOverdue() {
		assertThatThrownBy(() -> AgingBucket.of(0)).isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> AgingBucket.of(-5)).isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void bucketsAreContiguousWithoutGapsOrOverlap() {
		AgingBucket[] all = AgingBucket.values();
		for (int i = 1; i < all.length; i++) {
			assertThat(all[i].getFromDays()).isEqualTo(all[i - 1].getToDays() + 1);
		}
		assertThat(all[all.length - 1].getToDays()).isNull();
	}
}
