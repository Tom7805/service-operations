package com.serviceops.modules.identity.auth.repository;

import com.serviceops.modules.identity.auth.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Lưu trữ phiên "chờ OTP" của xác thực hai bước (NCL-01-CN-009).
 */
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    Optional<UserSession> findByTokenId(String tokenId);
}
