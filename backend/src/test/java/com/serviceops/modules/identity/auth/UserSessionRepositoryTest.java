package com.serviceops.modules.identity.auth;

import com.serviceops.modules.identity.auth.entity.UserSession;
import com.serviceops.modules.identity.auth.repository.UserSessionRepository;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class UserSessionRepositoryTest {

    @Test
    void findByTokenId_usesPessimisticWriteLock() throws NoSuchMethodException {
        Method method = UserSessionRepository.class.getMethod("findByTokenId", String.class);

        assertThat(method.getAnnotation(Lock.class).value())
                .isEqualTo(LockModeType.PESSIMISTIC_WRITE);
    }
}