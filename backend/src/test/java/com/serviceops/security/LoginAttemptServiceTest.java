package com.serviceops.security;

import com.serviceops.modules.identity.auth.repository.LoginAttemptRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LoginAttemptServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LoginAttemptRepository loginAttemptRepository;

    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void setUp() {
        loginAttemptService = new LoginAttemptService(userRepository, loginAttemptRepository);
    }

    @Test
    void lockForTwoFactor_setsLockTimeAndSavesUser() {
        User user = new User();
        LocalDateTime before = LocalDateTime.now().plusMinutes(15);

        loginAttemptService.lockForTwoFactor(user, 15);

        assertThat(user.getLockedUntil()).isAfterOrEqualTo(before);
        verify(userRepository).save(user);
    }

    @Test
    void lockForTwoFactor_usesNewTransaction() throws NoSuchMethodException {
        Method method = LoginAttemptService.class.getMethod("lockForTwoFactor", User.class, long.class);

        assertThat(method.getAnnotation(Transactional.class).propagation())
                .isEqualTo(Propagation.REQUIRES_NEW);
    }
}