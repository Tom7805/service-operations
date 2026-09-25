package com.serviceops.modules.admin;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.dto.request.ServiceCatalogReq;
import com.serviceops.modules.admin.dto.request.ServiceCatalogStatusReq;
import com.serviceops.modules.admin.dto.request.ServiceCatalogUpdateReq;
import com.serviceops.modules.admin.dto.request.ServicePriceReq;
import com.serviceops.modules.admin.dto.response.ServiceCatalogRes;
import com.serviceops.modules.admin.mapper.AdminMapper;
import com.serviceops.modules.admin.repository.ServicePriceRepository;
import com.serviceops.modules.admin.service.ServiceCatalogService;
import com.serviceops.modules.admin.service.impl.ServiceCatalogServiceImpl;
import com.serviceops.modules.admin.validator.ServiceNameUniqueValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/**
 * BE-QA NCL-15-CN-001 tren JPA that (H2): tao dich vu kem gia (TC-01), chan trung ten (TC-02), nhat ky (TC-04)
 * va QTN-28 — gia theo bang gia dang hieu luc tai ngay lap. TC-03 (403) nam o {@code AdminControllerIT}.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({ServiceCatalogServiceImpl.class, ServiceNameUniqueValidator.class, AdminMapper.class,
		ServiceCatalogServiceTest.Config.class})
class ServiceCatalogServiceTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 9, 25);

	@TestConfiguration
	static class Config {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-09-25T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}
	}

	@MockBean private AuditLogService auditLogService;
	@Autowired private ServiceCatalogService service;
	@Autowired private ServicePriceRepository priceRepository;

	@Test
	@DisplayName("TC-01: tao dich vu kem gia va ngay hieu luc -> co trong danh muc dung chung, ghi nhat ky")
	void createAppearsInCatalog() {
		ServiceCatalogRes created = service.create(req("Tư vấn triển khai", "500000", TODAY.minusDays(10)));

		assertThat(created.code()).isEqualTo("DV" + String.format("%05d", created.id()));
		assertThat(created.hasEffectivePrice()).isTrue();
		assertThat(created.currentPrice()).isEqualByComparingTo("500000");
		assertThat(created.prices()).hasSize(1);
		assertThat(service.search(null, null, null)).extracting(ServiceCatalogRes::name).containsExactly("Tư vấn triển khai");
		assertThat(service.listSelectable(TODAY)).hasSize(1);
		verify(auditLogService).record(eq("Tạo dịch vụ trong danh mục"), eq(AuditTargetType.SYSTEM), anyLong(),
				anyString(), anyString());
	}

	@Test
	@DisplayName("TC-02: trung ten (khac hoa thuong / khoang trang) -> DUPLICATE_DATA, khong tao")
	void duplicateNameRejected() {
		service.create(req("Tư vấn triển khai", "500000", TODAY));

		assertThatThrownBy(() -> service.create(req("  tư vấn   TRIỂN khai ", "600000", TODAY)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode").isEqualTo(ErrorCode.DUPLICATE_DATA);
		assertThat(service.search(null, null, null)).hasSize(1);
		assertThat(priceRepository.count()).isEqualTo(1);
	}

	@Test
	@DisplayName("TC-02: doi ten trung voi dich vu khac -> DUPLICATE_DATA; giu nguyen ten cua chinh no thi duoc")
	void renameToExistingNameRejected() {
		service.create(req("Bảo trì hệ thống", "300000", TODAY));
		ServiceCatalogRes second = service.create(req("Đào tạo người dùng", "200000", TODAY));

		assertThatThrownBy(() -> service.update(second.id(), new ServiceCatalogUpdateReq("bảo trì hệ thống", "gio", null)))
				.extracting("errorCode").isEqualTo(ErrorCode.DUPLICATE_DATA);
		ServiceCatalogRes same = service.update(second.id(), new ServiceCatalogUpdateReq("Đào tạo người dùng", "buoi", "x"));
		assertThat(same.unit()).isEqualTo("buoi");
	}

	@Test
	@DisplayName("QTN-28: doi gia la them moc moi — moc cu giu nguyen, gia ap theo ngay lap chung tu")
	void priceFollowsEffectiveDate() {
		ServiceCatalogRes item = service.create(req("Kiểm thử phần mềm", "400000", LocalDate.of(2026, 1, 1)));
		service.addPrice(item.id(), new ServicePriceReq(new BigDecimal("450000"), LocalDate.of(2026, 7, 1), "Tang gia"));
		service.addPrice(item.id(), new ServicePriceReq(new BigDecimal("480000"), LocalDate.of(2027, 1, 1), null));

		assertThat(service.resolveEffectivePrice(item.id(), LocalDate.of(2026, 6, 30)).price()).isEqualByComparingTo("400000");
		assertThat(service.resolveEffectivePrice(item.id(), LocalDate.of(2026, 7, 1)).price()).isEqualByComparingTo("450000");
		assertThat(service.resolveEffectivePrice(item.id(), LocalDate.of(2027, 3, 1)).price()).isEqualByComparingTo("480000");

		ServiceCatalogRes detail = service.get(item.id(), TODAY);
		assertThat(detail.currentPrice()).isEqualByComparingTo("450000");
		assertThat(detail.prices())
				.extracting(p -> p.effectiveFrom(), p -> p.effectiveTo(), p -> p.current())
				.containsExactly(
						tuple(LocalDate.of(2027, 1, 1), null, false),
						tuple(LocalDate.of(2026, 7, 1), LocalDate.of(2026, 12, 31), true),
						tuple(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 30), false));
	}

	@Test
	@DisplayName("QTN-28: truoc moc gia dau tien -> thieu gia hieu luc, khong chon duoc dich vu")
	void missingEffectivePriceNotSelectable() {
		ServiceCatalogRes future = service.create(req("Dịch vụ tương lai", "100000", TODAY.plusDays(30)));

		assertThat(service.get(future.id(), TODAY).hasEffectivePrice()).isFalse();
		assertThat(service.listSelectable(TODAY)).isEmpty();
		assertThatThrownBy(() -> service.resolveEffectivePrice(future.id(), TODAY))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode").isEqualTo(ErrorCode.INVALID_STATE);
		assertThat(service.listSelectable(TODAY.plusDays(30))).hasSize(1);
	}

	@Test
	@DisplayName("Dich vu da ngung khong con trong danh sach chon; trung ngay hieu luc -> DUPLICATE_DATA")
	void inactiveAndDuplicatePriceDate() {
		ServiceCatalogRes item = service.create(req("Hỗ trợ từ xa", "150000", TODAY));
		assertThatThrownBy(() -> service.addPrice(item.id(), new ServicePriceReq(BigDecimal.TEN, TODAY, null)))
				.extracting("errorCode").isEqualTo(ErrorCode.DUPLICATE_DATA);

		service.updateStatus(item.id(), new ServiceCatalogStatusReq(false));
		assertThat(service.listSelectable(TODAY)).isEmpty();
		assertThatThrownBy(() -> service.resolveEffectivePrice(item.id(), TODAY))
				.extracting("errorCode").isEqualTo(ErrorCode.INVALID_STATE);
		assertThatThrownBy(() -> service.updateStatus(item.id(), new ServiceCatalogStatusReq(false)))
				.extracting("errorCode").isEqualTo(ErrorCode.INVALID_STATE);
	}

	private static ServiceCatalogReq req(String name, String price, LocalDate from) {
		return new ServiceCatalogReq(name, "gio", null, new BigDecimal(price), from);
	}
}
