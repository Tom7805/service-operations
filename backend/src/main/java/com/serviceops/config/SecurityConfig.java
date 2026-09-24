package com.serviceops.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.RestAccessDeniedHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.function.Supplier;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /** Vai tro Khach hang (VT-09) — tai khoan cong khach hang cua Epic NCL-13. */
    public static final String PORTAL_AUTHORITY = "ROLE_VT-09";

    private final JwtAuthFilter jwtAuthFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<AccessDeniedAuditRecorder> accessDeniedAuditRecorderProvider;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * QTN-26 — tach bach hai the gioi:
     * <ul>
     *   <li>{@code /portal/**}: chi tai khoan cong khach hang (VT-09);</li>
     *   <li>{@code /auth/**}, {@code /notifications/**}: moi tai khoan da dang nhap (dang nhap, doi mat khau,
     *       thong tin ban than, thong bao cua chinh minh);</li>
     *   <li>moi API con lai la API noi bo: tai khoan VT-09 bi chan ngay o tang bo loc, ke ca endpoint chi
     *       yeu cau {@code isAuthenticated()} hoac khong gan {@code @PreAuthorize} (vd {@code GET /departments}).</li>
     * </ul>
     * Luot bi chan o day di qua {@link RestAccessDeniedHandler}: 403 + ghi Nhat ky "Tu choi truy cap".
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                })
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(new RestAccessDeniedHandler(objectMapper, accessDeniedAuditRecorderProvider)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/login", "/auth/two-factor/verify", "/auth/forgot-password", "/auth/reset-password/**",
                                "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/portal/**").hasRole("VT-09")
                        .requestMatchers("/auth/**", "/notifications/**", "/error").authenticated()
                        .anyRequest().access(SecurityConfig::internalApi)
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /** API noi bo: da dang nhap va khong phai tai khoan cong khach hang. */
    private static AuthorizationDecision internalApi(Supplier<Authentication> authenticationSupplier,
                                                     RequestAuthorizationContext context) {
        Authentication authentication = authenticationSupplier.get();
        boolean authenticated = authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
        return new AuthorizationDecision(authenticated && !isPortalUser(authentication));
    }

    public static boolean isPortalUser(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> PORTAL_AUTHORITY.equals(authority.getAuthority()));
    }
}
