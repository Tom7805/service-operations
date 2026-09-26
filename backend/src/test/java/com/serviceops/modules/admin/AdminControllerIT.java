package com.serviceops.modules.admin;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.admin.controller.BackupController;
import com.serviceops.modules.admin.controller.CompanySettingController;
import com.serviceops.modules.admin.controller.DataImportController;
import com.serviceops.modules.admin.controller.FiscalPeriodController;
import com.serviceops.modules.admin.controller.ServiceCatalogController;
import com.serviceops.modules.admin.enums.ImportTargetType;
import com.serviceops.modules.admin.service.BackupService;
import com.serviceops.modules.admin.service.CompanySettingService;
import com.serviceops.modules.admin.service.DataImportService;
import com.serviceops.modules.admin.service.FiscalPeriodService;
import com.serviceops.modules.admin.service.RestoreService;
import com.serviceops.modules.admin.service.ServiceCatalogService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tang HTTP cua Epic NCL-15: TC "Khong co quyen" cua ca 4 story (403 + ghi "Tu choi truy cap", service khong bi
 * goi), 400 khi thieu du lieu bat buoc, va cac API chi doc mo cho vai tro lap bao gia / xem bao cao.
 */
@WebMvcTest(controllers = {ServiceCatalogController.class, CompanySettingController.class, FiscalPeriodController.class,
		BackupController.class, DataImportController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class AdminControllerIT {

	@Autowired private MockMvc mockMvc;

	@MockBean private ServiceCatalogService serviceCatalogService;
	@MockBean private CompanySettingService companySettingService;
	@MockBean private FiscalPeriodService fiscalPeriodService;
	@MockBean private BackupService backupService;
	@MockBean private RestoreService restoreService;
	@MockBean private DataImportService dataImportService;
	@MockBean private AccessDeniedAuditRecorder accessDeniedAuditRecorder;
	@MockBean private JwtProvider jwtProvider;
	@MockBean private CustomUserDetailsService customUserDetailsService;

	private static final String VALID_SERVICE = "{\"name\":\"Tu van trien khai\",\"unit\":\"gio\",\"price\":500000,"
			+ "\"effectiveFrom\":\"2026-01-01\"}";
	private static final String VALID_COMPANY = "{\"companyName\":\"Cong ty Mo phong\",\"currency\":\"VND\","
			+ "\"fiscalYearStartMonth\":4,\"standardWorkingDaysPerMonth\":22}";

	// ------------------------------------------------------------ NCL-15-CN-001

	@Test
	@DisplayName("NCL-15-CN-001-TC-03: khong phai Quan tri vien -> 403 va ghi nhat ky tu choi")
	void catalogDeniedForNonAdmin() throws Exception {
		mockMvc.perform(post("/service-catalog").with(user("VT-05")).contentType("application/json").content(VALID_SERVICE))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
		mockMvc.perform(get("/service-catalog").with(user("VT-04")))
				.andExpect(status().isForbidden());
		verify(accessDeniedAuditRecorder).record(eq("POST"), eq("/service-catalog"));
		verifyNoInteractions(serviceCatalogService);
	}

	@Test
	@DisplayName("NCL-15-CN-001: thieu ten / gia khong duong -> 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-07")
	void catalogValidation() throws Exception {
		mockMvc.perform(post("/service-catalog").contentType("application/json")
						.content("{\"name\":\" \",\"unit\":\"gio\",\"price\":0,\"effectiveFrom\":\"2026-01-01\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.length()").value(2));
		verifyNoInteractions(serviceCatalogService);
	}

	@Test
	@DisplayName("QTN-28: vai tro lap bao gia/hoa don doc duoc danh sach dich vu chon duoc, khong sua duoc danh muc")
	void selectableOpenForQuotingRoles() throws Exception {
		when(serviceCatalogService.listSelectable(any())).thenReturn(List.of());
		for (String role : List.of("VT-04", "VT-05", "VT-02", "VT-01")) {
			mockMvc.perform(get("/service-catalog/selectable").with(user(role))).andExpect(status().isOk());
		}
		mockMvc.perform(get("/service-catalog/selectable").with(user("VT-03"))).andExpect(status().isForbidden());
		mockMvc.perform(put("/service-catalog/1").with(user("VT-04")).contentType("application/json")
						.content("{\"name\":\"X\",\"unit\":\"gio\"}"))
				.andExpect(status().isForbidden());
	}

	// ------------------------------------------------------------ NCL-15-CN-002

	@Test
	@DisplayName("NCL-15-CN-002-TC-03: khong phai Quan tri vien -> 403 va ghi nhat ky tu choi")
	void companySettingsDeniedForNonAdmin() throws Exception {
		mockMvc.perform(put("/company-settings").with(user("VT-01")).contentType("application/json").content(VALID_COMPANY))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/company-settings").with(user("VT-05"))).andExpect(status().isForbidden());
		verify(accessDeniedAuditRecorder).record(eq("PUT"), eq("/company-settings"));
		verifyNoInteractions(companySettingService);
	}

	@Test
	@DisplayName("NCL-15-CN-002-TC-02: thieu ten cong ty -> 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-07")
	void companyNameRequired() throws Exception {
		mockMvc.perform(put("/company-settings").contentType("application/json")
						.content("{\"companyName\":\"\",\"currency\":\"VND\",\"fiscalYearStartMonth\":4,"
								+ "\"standardWorkingDaysPerMonth\":22}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors[0].field").value("companyName"));
		mockMvc.perform(put("/company-settings").contentType("application/json")
						.content(VALID_COMPANY.replace("\"fiscalYearStartMonth\":4", "\"fiscalYearStartMonth\":13")))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(companySettingService);
	}

	@Test
	@DisplayName("NCL-15-CN-002-TC-01: ky tai chinh doc duoc boi vai tro xem bao cao, nhan vien chuyen mon thi khong")
	void fiscalPeriodsReadableByReportRoles() throws Exception {
		mockMvc.perform(get("/fiscal-periods/2026").with(user("VT-01"))).andExpect(status().isOk());
		mockMvc.perform(get("/fiscal-periods/current").param("date", "2026-05-01").with(user("VT-05")))
				.andExpect(status().isOk());
		verify(fiscalPeriodService).resolve(LocalDate.of(2026, 5, 1));
		mockMvc.perform(get("/fiscal-periods/2026").with(user("VT-03"))).andExpect(status().isForbidden());
	}

	// ------------------------------------------------------------ NCL-15-CN-003

	@Test
	@DisplayName("NCL-15-CN-003-TC-03 / QTN-30: khong phai Quan tri vien -> 403, khong sao luu / phuc hoi")
	void backupDeniedForNonAdmin() throws Exception {
		mockMvc.perform(post("/backups").with(user("VT-05"))).andExpect(status().isForbidden());
		mockMvc.perform(post("/backups/1/restore-requests").with(user("VT-01"))).andExpect(status().isForbidden());
		mockMvc.perform(post("/backups/restore-requests/1/confirm").with(user("VT-06")).contentType("application/json")
						.content("{\"confirmationToken\":\"x\",\"password\":\"y\"}"))
				.andExpect(status().isForbidden());
		verify(accessDeniedAuditRecorder).record(eq("POST"), eq("/backups/1/restore-requests"));
		verifyNoInteractions(backupService, restoreService);
	}

	@Test
	@DisplayName("QTN-30: buoc 2 thieu ma xac nhan hoac mat khau -> 400, khong phuc hoi")
	@WithMockUser(authorities = "ROLE_VT-07")
	void restoreConfirmRequiresBothFactors() throws Exception {
		mockMvc.perform(post("/backups/restore-requests/1/confirm").contentType("application/json")
						.content("{\"confirmationToken\":\"abc\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.fieldErrors[0].field").value("password"));
		verifyNoInteractions(restoreService);
	}

	// ------------------------------------------------------------ NCL-15-CN-004

	@Test
	@DisplayName("NCL-15-CN-004-TC-04: khong phai Quan tri vien -> 403 va ghi nhat ky tu choi")
	void importDeniedForNonAdmin() throws Exception {
		MockMultipartFile file = new MockMultipartFile("file", "kh.csv", "text/csv", "Tên khách hàng\nA".getBytes());
		mockMvc.perform(multipart("/imports/preview").file(file).param("targetType", "CUSTOMER").with(user("VT-04")))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/imports/1/commit").with(user("VT-06"))).andExpect(status().isForbidden());
		verify(accessDeniedAuditRecorder).record(eq("POST"), eq("/imports/preview"));
		verifyNoInteractions(dataImportService);
	}

	@Test
	@DisplayName("NCL-15-CN-004: thieu tep / sai loai tep / loai du lieu la -> 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-07")
	void importUploadValidation() throws Exception {
		mockMvc.perform(multipart("/imports/preview").param("targetType", "CUSTOMER"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
		MockMultipartFile xlsx = new MockMultipartFile("file", "kh.xlsx", "application/octet-stream", new byte[]{1, 2});
		mockMvc.perform(multipart("/imports/preview").file(xlsx).param("targetType", "CUSTOMER"))
				.andExpect(status().isBadRequest());
		MockMultipartFile csv = new MockMultipartFile("file", "kh.csv", "text/csv", "a".getBytes());
		mockMvc.perform(multipart("/imports/preview").file(csv).param("targetType", "INVOICE"))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(dataImportService);
	}

	@Test
	@DisplayName("NCL-15-CN-004: Quan tri vien tai tep mau CSV")
	@WithMockUser(authorities = "ROLE_VT-07")
	void downloadTemplate() throws Exception {
		when(dataImportService.template(ImportTargetType.EMPLOYEE)).thenReturn("a,b".getBytes());
		mockMvc.perform(get("/imports/templates/EMPLOYEE"))
				.andExpect(status().isOk())
				.andExpect(header().string("Content-Disposition", "attachment; filename=\"mau-nhap-employee.csv\""));
	}

	private static RequestPostProcessor user(String role) {
		return SecurityMockMvcRequestPostProcessors.user("u-" + role).authorities(new SimpleGrantedAuthority("ROLE_" + role));
	}
}
