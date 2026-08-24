package com.serviceops.modules.identity.employee.controller;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.identity.employee.dto.response.EmployeeRes;
import com.serviceops.modules.identity.employee.service.EmployeeService;
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
 * Kiem tra tang HTTP cua GET /employees (NCL-01-CN-007, TC-04):
 * chi Nhan su (VT-06) va Quan tri vien (VT-07) duoc mo, vai tro khac bi tu choi.
 */
@WebMvcTest(controllers = EmployeeController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class EmployeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EmployeeService employeeService;

    @MockBean
    private JwtProvider jwtProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    @WithMockUser(authorities = "ROLE_VT-06")
    void allowsHrRole() throws Exception {
        when(employeeService.findAll(any())).thenReturn(List.of());

        mockMvc.perform(get("/employees"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(authorities = "ROLE_VT-07")
    void allowsAdminRole() throws Exception {
        when(employeeService.findAll(any())).thenReturn(List.of(
                new EmployeeRes(1L, 1L, "nhanvien01", "Nguyen Van A", null, null, null, null, null, null)));

        mockMvc.perform(get("/employees"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("nhanvien01"));
    }

    @Test
    @WithMockUser(authorities = "ROLE_VT-02")
    void deniesOtherRoles() throws Exception {
        mockMvc.perform(get("/employees"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }
}
