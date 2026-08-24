package com.serviceops.common.audit.controller;

import com.serviceops.common.audit.dto.SensitiveAccessLogPage;
import com.serviceops.common.audit.service.SensitiveAccessLogService;
import com.serviceops.config.SecurityConfig;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua GET /sensitive-access-logs (NCL-01-CN-006):
 * phan quyen VT-07 (TC-03) va rang buoc page/size that su duoc validate
 * qua pipeline @Valid cua Spring (khong chi khai bao suong tren DTO).
 */
@WebMvcTest(controllers = SensitiveAccessLogController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class SensitiveAccessLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SensitiveAccessLogService service;

    @MockBean
    private JwtProvider jwtProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    @WithMockUser(authorities = "ROLE_VT-07")
    void allowsAdminAndReturnsPage() throws Exception {
        when(service.search(any())).thenReturn(new SensitiveAccessLogPage(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/sensitive-access-logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    @WithMockUser(authorities = "ROLE_VT-02")
    void deniesNonAdminRole() throws Exception {
        mockMvc.perform(get("/sensitive-access-logs"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    @WithMockUser(authorities = "ROLE_VT-07")
    void rejectsNegativePageWithValidationError() throws Exception {
        mockMvc.perform(get("/sensitive-access-logs").param("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(authorities = "ROLE_VT-07")
    void rejectsSizeAboveTheAllowedMaximum() throws Exception {
        mockMvc.perform(get("/sensitive-access-logs").param("size", "500"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
}
