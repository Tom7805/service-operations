package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.service.impl.TimesheetReminderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test nghiep vu nhac nop bang cham cong cuoi tuan (NCL-06-CN-009).
 */
@ExtendWith(MockitoExtension.class)
class TimesheetReminderServiceTest {

	private static final LocalDate WEEK_FROM = LocalDate.of(2026, 9, 7);
	private static final LocalDate WEEK_TO = LocalDate.of(2026, 9, 13);
	private static final Long USER_ID = 101L;
	private static final Long PM_ID = 5L;
	private static final Long PROJECT_ID = 9L;

	@Mock
	private TimeEntryRepository timeEntryRepository;
	@Mock
	private NotificationRepository notificationRepository;
	@Mock
	private NotificationService notificationService;
	@Mock
	private TaskRepository taskRepository;
	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private AuditLogService auditLogService;

	private TimesheetReminderServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new TimesheetReminderServiceImpl(timeEntryRepository,
				notificationRepository, notificationService, taskRepository, projectRepository, auditLogService);
	}

	@Test
	void findUnsubmittedUserIds_traVeDungNguoiConDongNhap() {
		// Given: hai nguoi con dong TimeEntry o trang thai NHAP trong tuan
		when(timeEntryRepository.findDistinctUserIdsWithDraftEntriesBetween(WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(101L, 102L));

		// When
		List<Long> result = service.findUnsubmittedUserIds(WEEK_FROM, WEEK_TO);

		// Then
		assertEquals(List.of(101L, 102L), result);
	}

	/**
	 * Sau khi cho phep nop bo sung viec moi vao mot tuan da APPROVED (Timesheet header
	 * van con APPROVED tu lan nop truoc), mot dong NHAP moi phat sinh sau do van phai
	 * duoc tinh la "chua nop" — khong duoc loai theo trang thai Timesheet cua ca tuan nua.
	 */
	@Test
	void findUnsubmittedUserIds_vanTinhLaChuaNopDuTuanDaTungDuocApprove() {
		when(timeEntryRepository.findDistinctUserIdsWithDraftEntriesBetween(WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(USER_ID));

		List<Long> result = service.findUnsubmittedUserIds(WEEK_FROM, WEEK_TO);

		assertEquals(List.of(USER_ID), result);
	}

	@Test
	void sendReminders_guiNhacChoNguoiChuaNopVaTongHopChoPm_TC01() {
		// Given: mot nguoi chua nop, chua tung duoc nhac trong tuan nay
		when(timeEntryRepository.findDistinctUserIdsWithDraftEntriesBetween(WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(USER_ID));
		when(notificationRepository.existsByRecipientIdAndTypeAndReferenceType(
				eq(USER_ID), eq(NotificationType.TIMESHEET_REMINDER), anyString())).thenReturn(false);
		when(notificationRepository.existsByRecipientIdAndTypeAndReferenceType(
				eq(PM_ID), eq(NotificationType.TIMESHEET_REMINDER), anyString())).thenReturn(false);

		Task task = new Task();
		task.setProjectId(PROJECT_ID);
		when(taskRepository.findByTimeEntriesUserIdAndWorkDateBetween(USER_ID, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(task));
		Project project = new Project();
		project.setProjectManagerId(PM_ID);
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));

		// When
		int reminded = service.sendReminders(WEEK_FROM, WEEK_TO);

		// Then: ca nhan vien lan PM deu nhan duoc dung mot thong bao
		assertEquals(1, reminded);
		verify(notificationService, times(1)).sendInAppNotification(
				eq(USER_ID), eq(NotificationType.TIMESHEET_REMINDER), anyString(), anyString(), eq(USER_ID), anyString());
		verify(notificationService, times(1)).sendInAppNotification(
				eq(PM_ID), eq(NotificationType.TIMESHEET_REMINDER), anyString(), anyString(), eq(PM_ID), anyString());
		verify(auditLogService, times(1)).record(anyString(), any(), any(), anyString(), anyString());
	}

	@Test
	void sendReminders_khongCoAiChuaNop_TC02() {
		// Given: khong ai con o trang thai nhap
		when(timeEntryRepository.findDistinctUserIdsWithDraftEntriesBetween(WEEK_FROM, WEEK_TO))
				.thenReturn(List.of());

		// When
		int reminded = service.sendReminders(WEEK_FROM, WEEK_TO);

		// Then: khong gui thong bao nao, khong ghi nhat ky
		assertEquals(0, reminded);
		verify(notificationService, never()).sendInAppNotification(
				anyLong(), any(), anyString(), anyString(), any(), anyString());
		verify(auditLogService, never()).record(anyString(), any(), any(), anyString(), anyString());
	}

	@Test
	void sendReminders_khongGuiTrungTrongCungTuan_QTN27() {
		// Given: nguoi nay da duoc nhac tu truoc trong chinh tuan nay
		when(timeEntryRepository.findDistinctUserIdsWithDraftEntriesBetween(WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(USER_ID));
		when(notificationRepository.existsByRecipientIdAndTypeAndReferenceType(
				eq(USER_ID), eq(NotificationType.TIMESHEET_REMINDER), anyString())).thenReturn(true);
		when(taskRepository.findByTimeEntriesUserIdAndWorkDateBetween(USER_ID, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of());

		// When
		int reminded = service.sendReminders(WEEK_FROM, WEEK_TO);

		// Then: khong gui lai cho nhan vien (da tinh la 0 nguoi vua duoc nhac)
		assertEquals(0, reminded);
		verify(notificationService, never()).sendInAppNotification(
				eq(USER_ID), eq(NotificationType.TIMESHEET_REMINDER), anyString(), anyString(), eq(USER_ID), anyString());
	}

	@Test
	void findUnsubmittedUserIds_khongCoAiViPhamTraVeDanhSachRong() {
		when(timeEntryRepository.findDistinctUserIdsWithDraftEntriesBetween(WEEK_FROM, WEEK_TO))
				.thenReturn(List.of());

		List<Long> result = service.findUnsubmittedUserIds(WEEK_FROM, WEEK_TO);

		assertTrue(result.isEmpty());
	}
}
