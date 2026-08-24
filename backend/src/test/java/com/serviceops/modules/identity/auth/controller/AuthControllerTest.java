package com.serviceops.modules.identity.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.service.AuthService;
import com.serviceops.modules.identity.auth.service.PasswordService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.security.CustomUserDetails;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import com.serviceops.security.scope.UserScope;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cho NCL-01-CN-008: /auth/change-password phai dang nhap
 * (TC-01), /auth/forgot-password va /auth/reset-password la cong khai.
 */
@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private PasswordService passwordService;

    @MockBean
    private JwtProvider jwtProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void changePassword_khongDangNhap_traVe401() throws Exception {
        ChangePasswordReq req = new ChangePasswordReq();
        req.setCurrentPassword("MatKhauCu1");
        req.setNewPassword("MatKhauMoi2");

        mockMvc.perform(post("/auth/change-password")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void changePassword_daDangNhap_goiServiceVaTraVeThanhCong() throws Exception {
        ChangePasswordReq req = new ChangePasswordReq();
        req.setCurrentPassword("MatKhauCu1");
        req.setNewPassword("MatKhauMoi2");

        mockMvc.perform(post("/auth/change-password")
                        .with(authentication(currentUserAuthentication()))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(passwordService).changePassword(eq(1L), any());
    }

    @Test
    void changePassword_saiMatKhauHienTai_traVe401() throws Exception {
        doThrow(new BusinessRuleException(ErrorCode.INVALID_CREDENTIALS, "Mat khau hien tai khong dung"))
                .when(passwordService).changePassword(any(), any());

        ChangePasswordReq req = new ChangePasswordReq();
        req.setCurrentPassword("SaiRoi1");
        req.setNewPassword("MatKhauMoi2");

        mockMvc.perform(post("/auth/change-password")
                        .with(authentication(currentUserAuthentication()))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    private UsernamePasswordAuthenticationToken currentUserAuthentication() {
        User user = new User();
        user.setId(1L);
        user.setUsername("nhanvien01");
        user.setPasswordHash("hashed");
        user.setStatus(UserStatus.ACTIVE);
        CustomUserDetails principal = new CustomUserDetails(user, List.of("VT-08"), UserScope.company());
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    @Test
    void forgotPassword_khongCanDangNhap_traVe200() throws Exception {
        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail("nhanvien01@service-operations.local");

        mockMvc.perform(post("/auth/forgot-password")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    void validateResetToken_khongCanDangNhap_traVeKetQua() throws Exception {
        when(passwordService.isResetTokenValid("abc")).thenReturn(true);

        mockMvc.perform(get("/auth/reset-password/validate").param("token", "abc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(true));
    }

    @Test
    void resetPassword_tokenKhongHopLe_traVe400() throws Exception {
        doThrow(new BusinessRuleException(ErrorCode.RESET_TOKEN_INVALID, "Lien ket khoi phuc khong hop le"))
                .when(passwordService).resetPassword(any());

        ResetPasswordReq req = new ResetPasswordReq();
        req.setToken("het-han");
        req.setNewPassword("MatKhauMoi2");

        mockMvc.perform(post("/auth/reset-password")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("RESET_TOKEN_INVALID"));
    }
}
