package com.serviceops.common.security;

import com.serviceops.config.properties.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Phát hành và xác thực access token (JWT). Token mang theo userId và
 * tokenVersion — khi đổi/khôi phục mật khẩu, tokenVersion của người dùng
 * tăng lên một đơn vị khiến mọi token phát hành trước đó (các phiên đăng
 * nhập khác) không còn hợp lệ. Đây là cách hiện thực tối thiểu cho tiêu chí
 * "chấm dứt các phiên đăng nhập khác" của NCL-01-CN-008 khi hệ thống chưa
 * có kho lưu phiên tập trung.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private static final String CLAIM_TOKEN_VERSION = "tv";

    private final JwtProperties jwtProperties;

    private Key signingKey() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes.length >= 32 ? keyBytes : pad(keyBytes));
    }

    private byte[] pad(byte[] keyBytes) {
        byte[] padded = new byte[32];
        System.arraycopy(keyBytes, 0, padded, 0, Math.min(keyBytes.length, 32));
        return padded;
    }

    public String generateToken(Long userId, String email, int tokenVersion) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getExpirationMs());
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim(CLAIM_TOKEN_VERSION, tokenVersion)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey())
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException ex) {
            log.debug("JWT hết hạn: {}", ex.getMessage());
            return false;
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("JWT không hợp lệ: {}", ex.getMessage());
            return false;
        }
    }

    public Long getUserId(Claims claims) {
        return Long.valueOf(claims.getSubject());
    }

    public int getTokenVersion(Claims claims) {
        return claims.get(CLAIM_TOKEN_VERSION, Integer.class);
    }
}
