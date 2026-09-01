package com.serviceops.modules.identity.auth.repository;

import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Tra cuu theo BAN BAM SHA-256 cua token, khong phai token tho.
     *
     * <p>Ben goi phai tu bam chuoi nguoi dung gui len roi truyen ban bam vao day.
     * Khong co phuong thuc tra cuu theo token tho, va do la co y: neu con mot
     * duong tra cuu nhu vay thi som muon cung co nguoi luu token tho tro lai.</p>
     */
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
}
