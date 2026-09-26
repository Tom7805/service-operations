package com.serviceops.modules.notification;

import com.serviceops.modules.notification.entity.NotificationAlertState;
import com.serviceops.modules.notification.entity.NotificationDedupConfig;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationAlertDedupLogRepository;
import com.serviceops.modules.notification.repository.NotificationAlertStateRepository;
import com.serviceops.modules.notification.repository.NotificationDedupConfigRepository;
import com.serviceops.modules.notification.service.impl.NotificationAntiDuplicateServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-14-CN-003 (QTN-27): chong gui trung theo dot canh bao (episode) cho cac su kien duoc tac vu
 * nen ra soat dinh ky — Option A: mo phong o tang service, khong can job quet thuc te. Dung
 * TASK_BUDGET_EXCEEDED lam vi du minh hoa "cong viec vuot nguong ngan sach" trong AC.
 */
@ExtendWith(MockitoExtension.class)
class NotificationAntiDuplicateServiceTest {

	private static final NotificationType EVENT_TYPE = NotificationType.TASK_BUDGET_EXCEEDED;
	private static final Long TASK_ID = 42L;

	@Mock
	private NotificationDedupConfigRepository notificationDedupConfigRepository;
	@Mock
	private NotificationAlertStateRepository notificationAlertStateRepository;
	@Mock
	private NotificationAlertDedupLogRepository notificationAlertDedupLogRepository;

	private NotificationAntiDuplicateServiceImpl service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-26T08:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		service = new NotificationAntiDuplicateServiceImpl(
				notificationDedupConfigRepository, notificationAlertStateRepository, notificationAlertDedupLogRepository, clock);
	}

	/** Mac dinh: chua co ban ghi cau hinh rieng cho loai su kien nay (dedup mac dinh bat). */
	private void noConfigOverride() {
		when(notificationDedupConfigRepository.findByEventType(EVENT_TYPE)).thenReturn(Optional.empty());
	}

	/** Mo phong save() cua JPA repository: tra ve dung ban ghi da truyen vao (khong tra ve null). */
	private void stateSaveReturnsItsArgument() {
		when(notificationAlertStateRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
	}

	private NotificationAlertState state(boolean active, int episodeNo) {
		NotificationAlertState state = new NotificationAlertState();
		state.setEventType(EVENT_TYPE);
		state.setReferenceId(TASK_ID);
		state.setActive(active);
		state.setEpisodeNo(episodeNo);
		return state;
	}

	@Test
	void lanDauVuotNguong_taoDotCanhBaoDau_guiChoTatCaUngVien() {
		noConfigOverride();
		stateSaveReturnsItsArgument();
		when(notificationAlertStateRepository.findByEventTypeAndReferenceId(EVENT_TYPE, TASK_ID))
				.thenReturn(Optional.empty());

		List<Long> result = service.resolveRecipientsToNotify(EVENT_TYPE, TASK_ID, List.of(1L, 2L), true);

		assertEquals(List.of(1L, 2L), result);
		verify(notificationAlertDedupLogRepository).existsByEventTypeAndReferenceIdAndRecipientIdAndEpisodeNo(
				EVENT_TYPE, TASK_ID, 1L, 1);
	}

	@Test
	void tc01_daGuiRoiTrongCungDot_boQuaNguoiDaNhanChiGuiNguoiChuaNhan() {
		noConfigOverride();
		stateSaveReturnsItsArgument();
		NotificationAlertState existing = state(true, 1);
		when(notificationAlertStateRepository.findByEventTypeAndReferenceId(EVENT_TYPE, TASK_ID))
				.thenReturn(Optional.of(existing));
		when(notificationAlertDedupLogRepository.existsByEventTypeAndReferenceIdAndRecipientIdAndEpisodeNo(
				EVENT_TYPE, TASK_ID, 1L, 1)).thenReturn(true);
		when(notificationAlertDedupLogRepository.existsByEventTypeAndReferenceIdAndRecipientIdAndEpisodeNo(
				EVENT_TYPE, TASK_ID, 2L, 1)).thenReturn(false);

		List<Long> result = service.resolveRecipientsToNotify(EVENT_TYPE, TASK_ID, List.of(1L, 2L), true);

		assertEquals(List.of(2L), result);
		assertEquals(1, existing.getEpisodeNo());
	}

	@Test
	void tc02_thoatNguongRoiVuotLai_coiLaDotCanhBaoMoiVaGuiLaiChoNguoiDaNhan() {
		noConfigOverride();
		stateSaveReturnsItsArgument();
		NotificationAlertState existing = state(true, 1);
		when(notificationAlertStateRepository.findByEventTypeAndReferenceId(EVENT_TYPE, TASK_ID))
				.thenReturn(Optional.of(existing));

		List<Long> whenExited = service.resolveRecipientsToNotify(EVENT_TYPE, TASK_ID, List.of(1L), false);
		assertTrue(whenExited.isEmpty());
		assertFalse(existing.getActive());

		List<Long> whenBreachedAgain = service.resolveRecipientsToNotify(EVENT_TYPE, TASK_ID, List.of(1L), true);

		assertEquals(List.of(1L), whenBreachedAgain);
		assertEquals(2, existing.getEpisodeNo());
	}

	@Test
	void dedupTat_luonGuiChoTatCaKhongChiemKhoaHayDoiTrangThai() {
		NotificationDedupConfig disabled = new NotificationDedupConfig();
		disabled.setEventType(EVENT_TYPE);
		disabled.setDedupEnabled(false);
		when(notificationDedupConfigRepository.findByEventType(EVENT_TYPE)).thenReturn(Optional.of(disabled));
		when(notificationAlertStateRepository.findByEventTypeAndReferenceId(EVENT_TYPE, TASK_ID))
				.thenReturn(Optional.of(state(true, 1)));

		List<Long> result = service.resolveRecipientsToNotify(EVENT_TYPE, TASK_ID, List.of(1L, 2L), true);

		assertEquals(List.of(1L, 2L), result);
		verify(notificationAlertDedupLogRepository, never()).save(any());
		verify(notificationAlertStateRepository, never()).save(any());
	}

	@Test
	void raceCondition_chiemKhoaThatBaiViTrungLap_khongTinhLaGuiThanhCong() {
		noConfigOverride();
		stateSaveReturnsItsArgument();
		when(notificationAlertStateRepository.findByEventTypeAndReferenceId(EVENT_TYPE, TASK_ID))
				.thenReturn(Optional.empty());
		when(notificationAlertDedupLogRepository.existsByEventTypeAndReferenceIdAndRecipientIdAndEpisodeNo(
				eq(EVENT_TYPE), eq(TASK_ID), any(), eq(1))).thenReturn(false);
		when(notificationAlertDedupLogRepository.save(any())).thenThrow(new DataIntegrityViolationException("dup"));

		List<Long> result = service.resolveRecipientsToNotify(EVENT_TYPE, TASK_ID, List.of(1L), true);

		assertTrue(result.isEmpty());
	}

	@Test
	void raceConditionKhiTaoTrangThaiMoi_doiThuKhacDaChiemTruoc_docLaiVaTiepTucDungEpisode() {
		noConfigOverride();
		NotificationAlertState winnerState = state(true, 1);
		when(notificationAlertStateRepository.findByEventTypeAndReferenceId(EVENT_TYPE, TASK_ID))
				.thenReturn(Optional.empty(), Optional.of(winnerState));
		when(notificationAlertStateRepository.save(any())).thenThrow(new DataIntegrityViolationException("dup"));

		List<Long> result = service.resolveRecipientsToNotify(EVENT_TYPE, TASK_ID, List.of(1L), true);

		assertEquals(List.of(1L), result);
		verify(notificationAlertDedupLogRepository).existsByEventTypeAndReferenceIdAndRecipientIdAndEpisodeNo(
				EVENT_TYPE, TASK_ID, 1L, 1);
	}

	@Test
	void khongVuotNguongNua_khongGuiGiVaTatTrangThaiDangHoatDong() {
		NotificationAlertState existing = state(true, 3);
		when(notificationAlertStateRepository.findByEventTypeAndReferenceId(EVENT_TYPE, TASK_ID))
				.thenReturn(Optional.of(existing));

		List<Long> result = service.resolveRecipientsToNotify(EVENT_TYPE, TASK_ID, List.of(1L), false);

		assertTrue(result.isEmpty());
		assertFalse(existing.getActive());
		verify(notificationAlertStateRepository, times(1)).save(existing);
	}
}
