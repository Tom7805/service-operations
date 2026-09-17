package com.serviceops.modules.timesheet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.timesheet.controller.TimeEntryController;
import com.serviceops.modules.timesheet.dto.request.TimeEntryCreateReq;
import com.serviceops.modules.timesheet.dto.request.TimeEntryUpdateReq;
import com.serviceops.modules.timesheet.dto.request.TimerStartReq;
import com.serviceops.modules.timesheet.dto.response.TimeEntryRes;
import com.serviceops.modules.timesheet.dto.response.TimeEntryTaskRes;
import com.serviceops.modules.timesheet.dto.response.TimerRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetSummaryRes;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.service.TimeEntryService;
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
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NCL-06-CN-001: kiem tra tang HTTP (vai tro, ma loi, dinh dang response) cho
 * cac API ghi gio cong theo cong viec — bo sung phan con thieu so voi unit
 * test o tang service ({@link TimeEntryServiceTest}), vi cac quy tac nhu chan
 * vai tro khac VT-03 (TC-03) va mapping ErrorCode -> HTTP status chi the hien
 * dung khi di qua {@code @PreAuthorize} va {@code GlobalExceptionHandler}.
 */
@WebMvcTest(controllers = TimeEntryController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class TimeEntryControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private TimeEntryService timeEntryService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private static final LocalDate WORK_DATE = LocalDate.of(2026, 9, 10);

	private TimeEntryRes sampleEntry() {
		return new TimeEntryRes(30L, 20L, 7L, WORK_DATE, new BigDecimal("3.5"), TimeEntryStatus.DRAFT,
				"Phan tich quy trinh hien tai", true, com.serviceops.modules.timesheet.enums.WorkType.NORMAL,
				LocalDateTime.parse("2026-09-10T15:20:00"));
	}

	@Test
	@DisplayName("TC-02/TC-03: Nhan vien chuyen mon (VT-03) ghi gio cong thanh cong — 200 OK")
	void allowsSpecialistToLogTime() throws Exception {
		TimeEntryCreateReq req = new TimeEntryCreateReq(WORK_DATE, new BigDecimal("3.5"), "Phan tich quy trinh hien tai", true, null);
		when(timeEntryService.create(eq(1L), eq(20L), any())).thenReturn(sampleEntry());

		mockMvc.perform(post("/projects/1/tasks/20/time-entries")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.id").value(30))
				.andExpect(jsonPath("$.data.status").value("DRAFT"));
	}

	@Test
	@DisplayName("NCL-06-CN-008: VT-03 bat dong ho bam gio — 200 OK")
	void allowsSpecialistToStartTimer() throws Exception {
		TimerStartReq req = new TimerStartReq("Phan tich quy trinh", true);
		when(timeEntryService.startTimer(eq(1L), eq(20L), eq(req.note()), eq(req.billable())))
				.thenReturn(new TimerRes(40L, 1L, 20L, 7L,
						LocalDateTime.parse("2026-09-10T15:20:00"), new BigDecimal("0.00"), req.note(), true));

		mockMvc.perform(post("/projects/1/tasks/20/time-entry-timer")
					.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.timerId").value(40))
				.andExpect(jsonPath("$.data.taskId").value(20))
				.andExpect(jsonPath("$.data.elapsedHours").value(0.0));
	}

	@Test
	@DisplayName("NCL-06-CN-008: dung dong ho tao ban ghi DRAFT — 200 OK")
	void stopsTimerAndReturnsTimeEntry() throws Exception {
		when(timeEntryService.stopTimer()).thenReturn(sampleEntry());

		mockMvc.perform(post("/me/time-entry-timer/stop")
					.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.id").value(30))
				.andExpect(jsonPath("$.data.status").value("DRAFT"));
	}

	@Test
	@DisplayName("NCL-06-CN-008: vai tro khac VT-03 bi tu choi bat dong ho")
	void deniesNonSpecialistRoleOnStartTimer() throws Exception {
		TimerStartReq req = new TimerStartReq("Ghi chu", true);

		mockMvc.perform(post("/projects/1/tasks/20/time-entry-timer")
					.with(SecurityMockMvcRequestPostProcessors.user("pm01").roles("VT-02"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("TC-03: vai tro khac VT-03 (vd VT-02) bi tu choi ghi gio cong — 403 FORBIDDEN")
	void deniesNonSpecialistRoleOnCreate() throws Exception {
		TimeEntryCreateReq req = new TimeEntryCreateReq(WORK_DATE, new BigDecimal("3.5"), "Ghi chu", true, null);

		mockMvc.perform(post("/projects/1/tasks/20/time-entries")
						.with(SecurityMockMvcRequestPostProcessors.user("pm01").roles("VT-02"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("TC-02: VT-03 hop le nhung khong duoc giao cong viec — 403 FORBIDDEN voi thong bao cu the")
	void deniesSpecialistNotAssignedToTask() throws Exception {
		TimeEntryCreateReq req = new TimeEntryCreateReq(WORK_DATE, new BigDecimal("3.5"), "Ghi chu", true, null);
		when(timeEntryService.create(eq(1L), eq(20L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.FORBIDDEN,
						"Ban khong phai nguoi duoc giao cong viec nay"));

		mockMvc.perform(post("/projects/1/tasks/20/time-entries")
						.with(SecurityMockMvcRequestPostProcessors.user("nv02").roles("VT-03"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"))
				.andExpect(jsonPath("$.message").value("Ban khong phai nguoi duoc giao cong viec nay"));
	}

	@Test
	@DisplayName("Du an da dong -> 400 INVALID_STATE")
	void rejectsClosedProject() throws Exception {
		TimeEntryCreateReq req = new TimeEntryCreateReq(WORK_DATE, new BigDecimal("3.5"), "Ghi chu", true, null);
		when(timeEntryService.create(eq(1L), eq(20L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.INVALID_STATE, "Khong the ghi gio cong cho du an da dong"));

		mockMvc.perform(post("/projects/1/tasks/20/time-entries")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@DisplayName("GET /me/time-entry-tasks: chi tra task thuoc du an dang chay")
	void returnsOnlyRunningAssignedTasks() throws Exception {
		when(timeEntryService.findMyRunningTasks()).thenReturn(List.of(
				new TimeEntryTaskRes(1L, "Du an dang chay", 20L, "Cong viec dang chay", null)));

		mockMvc.perform(get("/me/time-entry-tasks")
					.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].projectId").value(1))
				.andExpect(jsonPath("$.data[0].taskId").value(20));
	}

	@Test
	@DisplayName("Ghi trung (cong viec, ngay) -> 409 DUPLICATE_DATA")
	void rejectsDuplicateEntry() throws Exception {
		TimeEntryCreateReq req = new TimeEntryCreateReq(WORK_DATE, new BigDecimal("3.5"), "Ghi chu", true, null);
		when(timeEntryService.create(eq(1L), eq(20L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Da co ban ghi gio cong"));

		mockMvc.perform(post("/projects/1/tasks/20/time-entries")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errorCode").value("DUPLICATE_DATA"));
	}

	@Test
	@DisplayName("Thieu hours -> 400 VALIDATION_ERROR")
	void rejectsMissingHours() throws Exception {
		String body = "{\"workDate\":\"2026-09-10\",\"note\":\"Ghi chu\"}";

		mockMvc.perform(post("/projects/1/tasks/20/time-entries")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("Note rong -> 400 VALIDATION_ERROR (note la bat buoc khi tao moi)")
	void rejectsBlankNoteOnCreate() throws Exception {
		String body = "{\"workDate\":\"2026-09-10\",\"hours\":2,\"note\":\"\"}";

		mockMvc.perform(post("/projects/1/tasks/20/time-entries")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("PUT: sua gio cong ban ghi DRAFT cua chinh minh — 200 OK")
	void allowsUpdateOfOwnDraftEntry() throws Exception {
		TimeEntryUpdateReq req = new TimeEntryUpdateReq(new BigDecimal("4"), "Da chinh sua sau khi soat lai", true, null);
		when(timeEntryService.update(eq(1L), eq(20L), eq(30L), any())).thenReturn(
				new TimeEntryRes(30L, 20L, 7L, WORK_DATE, new BigDecimal("4"), TimeEntryStatus.DRAFT,
						"Da chinh sua sau khi soat lai", true, com.serviceops.modules.timesheet.enums.WorkType.NORMAL,
						LocalDateTime.parse("2026-09-10T15:20:00")));

		mockMvc.perform(put("/projects/1/tasks/20/time-entries/30")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.hours").value(4));
	}

	@Test
	@DisplayName("PUT: ban ghi da SUBMITTED/APPROVED -> 400 INVALID_STATE")
	void rejectsUpdateOfNonDraftEntry() throws Exception {
		TimeEntryUpdateReq req = new TimeEntryUpdateReq(new BigDecimal("4"), null, null, null);
		when(timeEntryService.update(eq(1L), eq(20L), eq(30L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.INVALID_STATE,
						"Ban ghi gio cong da nop/da duyet, khong the sua hoac xoa truc tiep"));

		mockMvc.perform(put("/projects/1/tasks/20/time-entries/30")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@DisplayName("PUT: ban ghi khong ton tai hoac khong phai cua minh -> 404 RESOURCE_NOT_FOUND")
	void rejectsUpdateOfMissingOrForeignEntry() throws Exception {
		TimeEntryUpdateReq req = new TimeEntryUpdateReq(new BigDecimal("4"), null, null, null);
		when(timeEntryService.update(eq(1L), eq(20L), eq(99L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ban ghi gio cong cua ban tren cong viec nay"));

		mockMvc.perform(put("/projects/1/tasks/20/time-entries/99")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	@Test
	@DisplayName("DELETE: xoa ban ghi DRAFT cua chinh minh — 200 OK, data null")
	void allowsDeleteOfOwnDraftEntry() throws Exception {
		mockMvc.perform(delete("/projects/1/tasks/20/time-entries/30")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data").doesNotExist());
	}

	@Test
	@DisplayName("DELETE: vai tro khac VT-03 bi tu choi — 403 FORBIDDEN")
	void deniesNonSpecialistRoleOnDelete() throws Exception {
		mockMvc.perform(delete("/projects/1/tasks/20/time-entries/30")
						.with(SecurityMockMvcRequestPostProcessors.user("pm01").roles("VT-02")))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("GET /me/time-entries: luoi tuan cua chinh minh — 200 OK")
	void returnsOwnWeeklyGrid() throws Exception {
		TimesheetSummaryRes summary = new TimesheetSummaryRes(20L, "Phong van nguoi dung",
				LocalDate.of(2026, 9, 7), LocalDate.of(2026, 9, 13), List.of(sampleEntry()),
				new BigDecimal("8"), new BigDecimal("8"), BigDecimal.ZERO,
				new BigDecimal("1.0000"), true);
		when(timeEntryService.findMyWeek(LocalDate.of(2026, 9, 7), LocalDate.of(2026, 9, 13)))
				.thenReturn(List.of(summary));

		mockMvc.perform(get("/me/time-entries")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03"))
						.param("weekFrom", "2026-09-07")
						.param("weekTo", "2026-09-13"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].taskId").value(20))
				.andExpect(jsonPath("$.data[0].overBudgetWarning").value(true));
	}

	@Test
	@DisplayName("GET /me/time-entries: thieu weekFrom/weekTo -> 400")
	void rejectsWeeklyGridWithoutRequiredParams() throws Exception {
		mockMvc.perform(get("/me/time-entries")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03")))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("Chua dang nhap -> 401 UNAUTHORIZED")
	void deniesAnonymousAccess() throws Exception {
		mockMvc.perform(get("/me/time-entries")
						.param("weekFrom", "2026-09-07")
						.param("weekTo", "2026-09-13"))
				.andExpect(status().isUnauthorized());
	}
}
