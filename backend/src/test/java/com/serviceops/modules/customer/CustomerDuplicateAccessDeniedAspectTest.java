package com.serviceops.modules.customer;

import com.serviceops.modules.customer.logging.CustomerAuditLogger;
import com.serviceops.modules.customer.logging.CustomerDuplicateAccessDeniedAspect;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.Signature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

/**
 * Unit test CustomerDuplicateAccessDeniedAspect (NCL-02-CN-002, TC-04): ghi nhat ky
 * lan tu choi truy cap ma khong lam hong response 403 goc, ke ca khi chinh viec
 * ghi log bi loi.
 */
@ExtendWith(MockitoExtension.class)
class CustomerDuplicateAccessDeniedAspectTest {

	@Mock
	private CustomerAuditLogger logger;

	@Mock
	private JoinPoint joinPoint;

	@Mock
	private Signature signature;

	private CustomerDuplicateAccessDeniedAspect aspect;

	@BeforeEach
	void setUp() {
		aspect = new CustomerDuplicateAccessDeniedAspect(logger);
		lenient().when(joinPoint.getSignature()).thenReturn(signature);
		lenient().when(signature.toShortString()).thenReturn("CustomerController.checkDuplicate()");
	}

	@Test
	@DisplayName("TC-04: tu choi truy cap thi ghi nhat ky mot lan")
	void logsDeniedAccessOnce() {
		aspect.logDenied(joinPoint, new AccessDeniedException("Forbidden"));

		verify(logger).logDeniedAccess(anyString(), anyString());
	}

	@Test
	@DisplayName("Loi khi ghi nhat ky khong duoc lam hong luong tra ve 403 goc")
	void doesNotPropagateWhenLoggingFails() {
		doThrow(new RuntimeException("DB down")).when(logger).logDeniedAccess(anyString(), anyString());

		assertThatCode(() -> aspect.logDenied(joinPoint, new AccessDeniedException("Forbidden")))
				.doesNotThrowAnyException();
	}
}
