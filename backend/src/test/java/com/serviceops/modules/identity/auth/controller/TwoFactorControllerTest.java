package com.serviceops.modules.identity.auth.controller;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.identity.auth.service.TwoFactorService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.security.CustomUserDetails;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import com.serviceops.security.TwoFactorRateLimiter;
import com.serviceops.security.scope.UserScope;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TwoFactorController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class TwoFactorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TwoFactorService twoFactorService;

    @MockBean
    private TwoFactorRateLimiter twoFactorRateLimiter;

    @MockBean
    private JwtProvider jwtProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void listConfigs_withoutAuthentication_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/auth/two-factor/configs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listConfigs_nonAdmin_returnsForbidden() throws Exception {
        mockMvc.perform(get("/auth/two-factor/configs")
                        .with(authentication(authenticationFor("VT-08"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void listConfigs_admin_callsService() throws Exception {
        when(twoFactorService.listConfigs()).thenReturn(List.of());

        mockMvc.perform(get("/auth/two-factor/configs")
                        .with(authentication(authenticationFor("VT-07"))))
                .andExpect(status().isOk());

        verify(twoFactorService).listConfigs();
    }

    @Test
    void resetEnrollment_admin_callsServiceWithPerformerId() throws Exception {
        mockMvc.perform(post("/auth/two-factor/users/5/reset")
                        .with(authentication(authenticationFor("VT-07"))))
                .andExpect(status().isOk());

        verify(twoFactorService).resetEnrollment(eq(5L), eq(1L));
    }

    @Test
    void resetEnrollment_nonAdmin_returnsForbidden() throws Exception {
        mockMvc.perform(post("/auth/two-factor/users/5/reset")
                        .with(authentication(authenticationFor("VT-06"))))
                .andExpect(status().isForbidden());
    }

    private UsernamePasswordAuthenticationToken authenticationFor(String role) {
        User user = new User();
        user.setId(1L);
        user.setUsername("test-user");
        user.setPasswordHash("hashed");
        user.setStatus(UserStatus.ACTIVE);
        CustomUserDetails principal = new CustomUserDetails(user, List.of(role), UserScope.company());
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }
}