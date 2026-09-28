package com.serviceops.modules.notification;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.notification.dto.request.NotificationPreferenceReq;
import com.serviceops.modules.notification.dto.response.NotificationPreferenceRes;
import com.serviceops.modules.notification.entity.NotificationPreference;
import com.serviceops.modules.notification.enums.NotificationFrequency;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.repository.NotificationPreferenceRepository;
import com.serviceops.modules.notification.service.impl.NotificationPreferenceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-14-CN-002: mac dinh bat + IMMEDIATE cho nhom chua tung cau hinh, va ghi audit log khi
 * nguoi dung thay doi cau hinh (TC-03).
 */
@ExtendWith(MockitoExtension.class)
class NotificationPreferenceServiceTest {

	private static final Long USER_ID = 7L;

	@Mock
	private NotificationPreferenceRepository notificationPreferenceRepository;
	@Mock
	private AuditLogService auditLogService;

	private NotificationPreferenceServiceImpl preferenceService;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-25T13:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		preferenceService = new NotificationPreferenceServiceImpl(notificationPreferenceRepository, auditLogService, clock);
	}

	private NotificationPreference savedPreference(NotificationGroup group, boolean enabled, NotificationFrequency frequency) {
		NotificationPreference pref = new NotificationPreference();
		pref.setUserId(USER_ID);
		pref.setNotificationGroup(group);
		pref.setEnabled(enabled);
		pref.setFrequency(frequency);
		return pref;
	}

	@Test
	void getPreferences_chuaCauHinhGiCa_traMacDinhBatVaImmediateChoDu6Nhom() {
		when(notificationPreferenceRepository.findByUserId(USER_ID)).thenReturn(List.of());

		List<NotificationPreferenceRes> result = preferenceService.getPreferences(USER_ID);

		assertEquals(NotificationGroup.values().length, result.size());
		assertTrue(result.stream().allMatch(r -> r.enabled() && r.frequency() == NotificationFrequency.IMMEDIATE));
	}

	@Test
	void getPreferences_daCauHinhMotNhom_giuGiaTriDaLuuChoNhomDo_conLaiMacDinh() {
		when(notificationPreferenceRepository.findByUserId(USER_ID))
				.thenReturn(List.of(savedPreference(NotificationGroup.INVOICE, false, NotificationFrequency.IMMEDIATE)));

		List<NotificationPreferenceRes> result = preferenceService.getPreferences(USER_ID);

		NotificationPreferenceRes invoicePref = result.stream()
				.filter(r -> r.notificationGroup() == NotificationGroup.INVOICE).findFirst().orElseThrow();
		assertFalse(invoicePref.enabled());

		NotificationPreferenceRes timesheetPref = result.stream()
				.filter(r -> r.notificationGroup() == NotificationGroup.TIMESHEET).findFirst().orElseThrow();
		assertTrue(timesheetPref.enabled());
		assertEquals(NotificationFrequency.IMMEDIATE, timesheetPref.frequency());
	}

	@Test
	void updatePreferences_nhomChuaTungCoBanGhi_taoMoiVaGhiAuditLog() {
		when(notificationPreferenceRepository.findByUserIdAndNotificationGroup(USER_ID, NotificationGroup.ACCEPTANCE))
				.thenReturn(Optional.empty());
		NotificationPreferenceReq request = new NotificationPreferenceReq(
				List.of(new NotificationPreferenceReq.Item(NotificationGroup.ACCEPTANCE, true, NotificationFrequency.DAILY_DIGEST)));

		preferenceService.updatePreferences(USER_ID, request);

		ArgumentCaptor<NotificationPreference> captor = ArgumentCaptor.forClass(NotificationPreference.class);
		verify(notificationPreferenceRepository, times(1)).save(captor.capture());
		NotificationPreference saved = captor.getValue();
		assertEquals(USER_ID, saved.getUserId());
		assertEquals(NotificationGroup.ACCEPTANCE, saved.getNotificationGroup());
		assertTrue(saved.getEnabled());
		assertEquals(NotificationFrequency.DAILY_DIGEST, saved.getFrequency());

		verify(auditLogService, times(1)).record(
				contains("Cap nhat cau hinh nhan thong bao"), eq(AuditTargetType.NOTIFICATION), eq(USER_ID), any(), any());
	}

	@Test
	void updatePreferences_nhomDaCoBanGhi_capNhatTrenBanGhiCu() {
		NotificationPreference existing = savedPreference(NotificationGroup.INVOICE, true, NotificationFrequency.IMMEDIATE);
		when(notificationPreferenceRepository.findByUserIdAndNotificationGroup(USER_ID, NotificationGroup.INVOICE))
				.thenReturn(Optional.of(existing));
		NotificationPreferenceReq request = new NotificationPreferenceReq(
				List.of(new NotificationPreferenceReq.Item(NotificationGroup.INVOICE, false, NotificationFrequency.IMMEDIATE)));

		preferenceService.updatePreferences(USER_ID, request);

		assertFalse(existing.getEnabled());
		verify(notificationPreferenceRepository, times(1)).save(existing);
	}

	@Test
	void resolve_nhomChuaCauHinh_traMacDinhBatImmediate() {
		when(notificationPreferenceRepository.findByUserIdAndNotificationGroup(USER_ID, NotificationGroup.PROJECT))
				.thenReturn(Optional.empty());

		NotificationPreferenceRes result = preferenceService.resolve(USER_ID, NotificationGroup.PROJECT);

		assertTrue(result.enabled());
		assertEquals(NotificationFrequency.IMMEDIATE, result.frequency());
	}

	@Test
	void resolve_nhomDaCauHinh_traDungGiaTriDaLuu() {
		when(notificationPreferenceRepository.findByUserIdAndNotificationGroup(USER_ID, NotificationGroup.PROJECT))
				.thenReturn(Optional.of(savedPreference(NotificationGroup.PROJECT, false, NotificationFrequency.DAILY_DIGEST)));

		NotificationPreferenceRes result = preferenceService.resolve(USER_ID, NotificationGroup.PROJECT);

		assertFalse(result.enabled());
		assertEquals(NotificationFrequency.DAILY_DIGEST, result.frequency());
	}
}
