package com.serviceops.security;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TwoFactorRateLimiterTest {

    private TwoFactorRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new TwoFactorRateLimiter();
        ReflectionTestUtils.setField(rateLimiter, "maxAttempts", 2);
        ReflectionTestUtils.setField(rateLimiter, "windowSeconds", 60L);
    }

    @Test
    void check_afterLimitExceeded_throwsTooManyRequests() {
        rateLimiter.check("127.0.0.1", "challenge-token");
        rateLimiter.check("127.0.0.1", "challenge-token");

        assertThatThrownBy(() -> rateLimiter.check("127.0.0.1", "challenge-token"))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TOO_MANY_REQUESTS);
    }

    @Test
    void check_limitsIpAndChallengeIndependently() {
        rateLimiter.check("127.0.0.1", "challenge-one");
        rateLimiter.check("127.0.0.1", "challenge-two");

        assertThatThrownBy(() -> rateLimiter.check("127.0.0.1", "challenge-three"))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TOO_MANY_REQUESTS);
    }
}