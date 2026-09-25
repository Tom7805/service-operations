package com.serviceops.modules.customer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import com.serviceops.common.api.PageRes;
import com.serviceops.modules.customer.dto.request.CustomerPageReq;
import com.serviceops.modules.customer.dto.response.CustomerPageSummaryRes;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.service.CustomerPageQueryService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;

/**
 * Danh sach khach hang phan trang chay tren JPA THAT (H2): bo loc, pham vi QTN-01 va so lieu tong
 * hop duoc tinh bang SQL phai cho cung ket qua voi cach loc tren trinh duyet truoc day.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({ CustomerPageQueryService.class, CustomerMapper.class })
class CustomerPageQueryServiceTest {

	@MockBean private CurrentUserScopeProvider scopeProvider;

	@Autowired private TestEntityManager em;
	@Autowired private CustomerPageQueryService service;

	private User salesA;
	private User salesB;

	@BeforeEach
	void setUp() {
		salesA = user("salesA", 10L);
		salesB = user("salesB", 20L);
		customer("Cong ty Alpha", "Cong nghe", "Lon", "Cao", "Ha Noi", salesA, LocalDateTime.now());
		customer("Cong ty Beta", " cong nghe ", "Nho", null, "Da Nang", salesB, LocalDateTime.of(2026, 1, 2, 8, 0));
		customer("Cong ty Gamma 100%", "Xay dung", null, "Thap", "Hue", salesA, LocalDateTime.of(2026, 1, 3, 8, 0));
		customer("Cong ty Khong chu", "Xay dung", null, null, null, null, LocalDateTime.of(2026, 1, 1, 8, 0));
		em.flush();
		asScope(UserScope.company(), salesA.getId());
	}

	@Test
	@DisplayName("Phan trang: moi nhat truoc, tong so dong/trang dung")
	void pagesNewestFirst() {
		PageRes<CustomerRes, CustomerPageSummaryRes> first = service.findPage(req(null, 0, 3));
		PageRes<CustomerRes, CustomerPageSummaryRes> second = service.findPage(req(null, 1, 3));

		assertThat(first.totalElements()).isEqualTo(4);
		assertThat(first.totalPages()).isEqualTo(2);
		assertThat(first.content()).extracting(CustomerRes::name)
				.containsExactly("Cong ty Alpha", "Cong ty Gamma 100%", "Cong ty Beta");
		assertThat(second.content()).extracting(CustomerRes::name).containsExactly("Cong ty Khong chu");
	}

	@Test
	@DisplayName("Tu khoa khop ca dia chi, khong phan biet hoa thuong")
	void keywordMatchesAddressCaseInsensitive() {
		assertThat(service.findPage(req("da nang", null, null)).content())
				.extracting(CustomerRes::name).containsExactly("Cong ty Beta");
	}

	@Test
	@DisplayName("Ky tu % trong tu khoa duoc so khop nguyen van, khong phai ky tu dai dien")
	void percentIsMatchedLiterally() {
		assertThat(service.findPage(req("100%", null, null)).content())
				.extracting(CustomerRes::name).containsExactly("Cong ty Gamma 100%");
		assertThat(service.findPage(req("%", null, null)).content())
				.extracting(CustomerRes::name).containsExactly("Cong ty Gamma 100%");
	}

	@Test
	@DisplayName("Loc nganh nghe bo qua hoa thuong va khoang trang")
	void industryFilterIgnoresCaseAndSpaces() {
		CustomerPageReq request = req(null, null, null);
		request.setIndustry("CONG NGHE");
		assertThat(service.findPage(request).content()).extracting(CustomerRes::name)
				.containsExactlyInAnyOrder("Cong ty Alpha", "Cong ty Beta");
	}

	@Test
	@DisplayName("So lieu tong hop tinh tren toan pham vi, khong theo bo loc")
	void summaryIgnoresFilters() {
		CustomerPageSummaryRes summary = service.findPage(req("alpha", null, null)).summary();

		assertThat(summary.total()).isEqualTo(4);
		assertThat(summary.createdToday()).isEqualTo(1);
		assertThat(summary.industries()).containsExactlyInAnyOrder("Cong nghe", "cong nghe", "Xay dung");
		assertThat(summary.companySizes()).containsExactlyInAnyOrder("Lon", "Nho");
		assertThat(summary.priorities()).containsExactlyInAnyOrder("Cao", "Thap");
	}

	@Test
	@DisplayName("Pham vi DEPARTMENT: chi ho so co nguoi phu trach thuoc phong ban duoc gan")
	void departmentScope() {
		asScope(new UserScope(DataScopeType.DEPARTMENT, Set.of(20L)), salesB.getId());

		PageRes<CustomerRes, CustomerPageSummaryRes> page = service.findPage(req(null, null, null));

		assertThat(page.content()).extracting(CustomerRes::name).containsExactly("Cong ty Beta");
		assertThat(page.summary().total()).isEqualTo(1);
	}

	@Test
	@DisplayName("Pham vi SELF: chi ho so do chinh nguoi xem phu trach, bo ho so khong co nguoi phu trach")
	void selfScope() {
		asScope(new UserScope(DataScopeType.SELF, Set.of()), salesA.getId());

		assertThat(service.findPage(req(null, null, null)).content()).extracting(CustomerRes::name)
				.containsExactly("Cong ty Alpha", "Cong ty Gamma 100%");
	}

	private void asScope(UserScope scope, Long userId) {
		when(scopeProvider.currentScope()).thenReturn(scope);
		when(scopeProvider.currentUserId()).thenReturn(userId);
	}

	private CustomerPageReq req(String keyword, Integer page, Integer size) {
		CustomerPageReq request = new CustomerPageReq();
		request.setKeyword(keyword);
		request.setPage(page);
		request.setSize(size);
		return request;
	}

	private User user(String username, Long departmentId) {
		User u = new User();
		u.setUsername(username);
		u.setPasswordHash("x");
		u.setFullName(username);
		u.setDepartmentId(departmentId);
		em.persist(u);
		return u;
	}

	private void customer(String name, String industry, String companySize, String priority, String address,
			User owner, LocalDateTime createdAt) {
		Customer customer = new Customer();
		customer.setCode("KH" + System.nanoTime());
		customer.setName(name);
		customer.setIndustry(industry);
		customer.setCompanySize(companySize);
		customer.setPriority(priority);
		customer.setAddress(address);
		customer.setOwnerId(owner == null ? null : owner.getId());
		customer.setCreatedAt(createdAt);
		em.persist(customer);
	}
}
