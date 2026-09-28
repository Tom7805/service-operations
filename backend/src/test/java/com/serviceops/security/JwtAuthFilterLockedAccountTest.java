package com.serviceops.security;

import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.security.scope.UserScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * NCL-01-CN-002: tai khoan bi quan tri vien khoa khong duoc dung tiep JWT da phat hanh truoc do (truoc day token cu
 * van hop le toi khi het han vi bo loc khong xet trang thai tai khoan).
 */
@ExtendWith(MockitoExtension.class)
class JwtAuthFilterLockedAccountTest {

	private static final String TOKEN = "token-cu";

	@Mock private JwtProvider jwtProvider;
	@Mock private CustomUserDetailsService userDetailsService;

	@InjectMocks private JwtAuthFilter filter;

	@AfterEach
	void clear() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("Tai khoan dang hoat dong + token dung phien ban -> xac thuc thanh cong")
	void activeAccountAuthenticated() throws Exception {
		givenTokenFor(UserStatus.ACTIVE);

		filter.doFilter(requestWithToken(), new MockHttpServletResponse(), new MockFilterChain());

		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
	}

	@Test
	@DisplayName("Tai khoan da bi khoa -> token cu khong con xac thuc duoc (API tra 401)")
	void lockedAccountRejected() throws Exception {
		givenTokenFor(UserStatus.LOCKED);

		filter.doFilter(requestWithToken(), new MockHttpServletResponse(), new MockFilterChain());

		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
	}

	private void givenTokenFor(UserStatus status) {
		User user = new User();
		user.setId(7L);
		user.setUsername("nv01");
		user.setFullName("Nhan vien");
		user.setPasswordHash("x");
		user.setStatus(status);
		when(jwtProvider.isValid(TOKEN)).thenReturn(true);
		when(jwtProvider.getUsername(TOKEN)).thenReturn("nv01");
		lenient().when(jwtProvider.getTokenVersion(TOKEN)).thenReturn(0);
		when(userDetailsService.loadUserByUsername("nv01"))
				.thenReturn(new CustomUserDetails(user, List.of("VT-03"), UserScope.company()));
	}

	private static MockHttpServletRequest requestWithToken() {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/me/tasks");
		request.addHeader("Authorization", "Bearer " + TOKEN);
		return request;
	}
}
