package com.serviceops.modules.identity.auth.repository;

import com.serviceops.modules.identity.auth.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {
}
