package com.serviceops.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    /** Chuỗi bí mật ký JWT — bắt buộc đặt qua biến môi trường JWT_SECRET khi triển khai thật. */
    private String secret;

    /** Thời hạn access token, tính bằng mili-giây. */
    private long expirationMs = 86_400_000L;
}
