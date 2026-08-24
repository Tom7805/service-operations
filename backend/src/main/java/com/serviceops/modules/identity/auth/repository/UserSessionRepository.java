package com.serviceops.modules.identity.auth.repository;

import com.serviceops.modules.identity.auth.entity.UserSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

/**
 * Lưu trữ phiên "chờ OTP" của xác thực hai bước (NCL-01-CN-009).
 */
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<UserSession> findByTokenId(String tokenId);
}
