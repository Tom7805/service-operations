package com.serviceops.modules.profitability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.profitability.dto.request.MarginThresholdReq;
import com.serviceops.modules.profitability.dto.response.MarginAlertRes;
import com.serviceops.modules.profitability.dto.response.ProjectMarginRes;
import com.serviceops.modules.profitability.entity.MarginThresholdSetting;
import com.serviceops.modules.profitability.repository.MarginThresholdSettingRepository;
import com.serviceops.modules.profitability.service.impl.MarginAlertServiceImpl;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class MarginAlertServiceTest {

	@Mock private MarginThresholdSettingRepository marginThresholdSettingRepository;
	@Mock private ProjectRepository projectRepository;
	@Mock private UserRoleScopeRepository userRoleScopeRepository;
	@Mock private NotificationRepository notificationRepository;
	@Mock private NotificationService notificationService;
	@Mock private AuditLogService auditLogService;

	private MarginAlertServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new MarginAlertServiceImpl(marginThresholdSettingRepository, projectRepository,
				userRoleScopeRepository, notificationRepository, notificationService, auditLogService);
	}

	private ProjectMarginRes marginOf(BigDecimal marginRate) {
		return new ProjectMarginRes(42L, BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
				BigDecimal.ZERO, BigDecimal.ONE, marginRate, 0, 0, List.of(), List.of());
	}

	private MarginThresholdSetting threshold(String rate) {
		MarginThresholdSetting setting = new MarginThresholdSetting();
		setting.setId(1L);
		setting.setMinMarginRate(new BigDecimal(rate));
		setting.setUpdatedBy("giamdoc");
		setting.setUpdatedAt(LocalDateTime.of(2026, 1, 1, 0, 0));
		return setting;
	}

	@Test
	@DisplayName("TC-02: bo qua du an chua co du lieu (marginRate null), khong tra nguong")
	void skipsAlertWhenMarginRateIsNull() {
		service.evaluateAndAlert(42L, marginOf(null));

		verifyNoInteractions(marginThresholdSettingRepository, notificationService, projectRepository,
				userRoleScopeRepository);
	}

	@Test
	@DisplayName("Chua co Ban giam doc nao dat nguong thi khong canh bao")
	void skipsAlertWhenNoThresholdConfigured() {
		when(marginThresholdSettingRepository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());

		service.evaluateAndAlert(42L, marginOf(new BigDecimal("-0.1000")));

		verify(notificationService, never()).sendInAppNotification(anyLong(), any(), any(), any(), any(), any());
	}

	@Test
	@DisplayName("Bien >= nguong thi khong canh bao")
	void skipsAlertWhenMarginMeetsThreshold() {
		when(marginThresholdSettingRepository.findTopByOrderByIdDesc())
				.thenReturn(Optional.of(threshold("0.1500")));

		service.evaluateAndAlert(42L, marginOf(new BigDecimal("0.2000")));

		verify(notificationService, never()).sendInAppNotification(anyLong(), any(), any(), any(), any(), any());
	}

	@Test
	@DisplayName("NCL-09-CN-004-TC-01: bien duoi nguong thi gui canh bao cho PM va Ban giam doc")
	void sendsAlertToProjectManagerAndBoardWhenBelowThreshold() {
		when(marginThresholdSettingRepository.findTopByOrderByIdDesc())
				.thenReturn(Optional.of(threshold("0.1500")));
		when(userRoleScopeRepository.findUserIdsByRoleCode("VT-01")).thenReturn(List.of(1L));
		Project project = new Project();
		project.setProjectManagerId(2L);
		when(projectRepository.findById(42L)).thenReturn(Optional.of(project));
		when(notificationRepository.existsByRecipientIdAndTypeAndReferenceType(
				anyLong(), eq(NotificationType.NEGATIVE_MARGIN_ALERT), any())).thenReturn(false);

		service.evaluateAndAlert(42L, marginOf(new BigDecimal("0.1000")));

		ArgumentCaptor<Long> recipientCaptor = ArgumentCaptor.forClass(Long.class);
		ArgumentCaptor<String> titleCaptor = ArgumentCaptor.forClass(String.class);
		verify(notificationService, org.mockito.Mockito.times(2)).sendInAppNotification(
				recipientCaptor.capture(), eq(NotificationType.NEGATIVE_MARGIN_ALERT),
				titleCaptor.capture(), any(), eq(42L), any());

		assertThat(recipientCaptor.getAllValues()).containsExactlyInAnyOrder(1L, 2L);
		assertThat(titleCaptor.getValue()).contains("duoi nguong");
	}

	@Test
	@DisplayName("Bien da am thi noi dung canh bao ghi ro muc do NEGATIVE")
	void marksNegativeLevelWhenMarginIsBelowZero() {
		when(marginThresholdSettingRepository.findTopByOrderByIdDesc())
				.thenReturn(Optional.of(threshold("0.1500")));
		when(userRoleScopeRepository.findUserIdsByRoleCode("VT-01")).thenReturn(List.of(1L));
		when(projectRepository.findById(42L)).thenReturn(Optional.empty());

		service.evaluateAndAlert(42L, marginOf(new BigDecimal("-0.0500")));

		ArgumentCaptor<String> titleCaptor = ArgumentCaptor.forClass(String.class);
		ArgumentCaptor<String> contentCaptor = ArgumentCaptor.forClass(String.class);
		verify(notificationService).sendInAppNotification(eq(1L), eq(NotificationType.NEGATIVE_MARGIN_ALERT),
				titleCaptor.capture(), contentCaptor.capture(), eq(42L), any());
		assertThat(titleCaptor.getValue()).contains("am bien");
		// Ty le hien thi 2 chu so thap phan (-5.00% / 15.00%), khong phai -5.0000% / 15.0000%.
		assertThat(contentCaptor.getValue()).contains("-5.00%").contains("15.00%");
	}

	@Test
	@DisplayName("Da gui canh bao trong ngay thi khong gui lai")
	void doesNotResendAlertOnSameDay() {
		when(marginThresholdSettingRepository.findTopByOrderByIdDesc())
				.thenReturn(Optional.of(threshold("0.1500")));
		when(userRoleScopeRepository.findUserIdsByRoleCode("VT-01")).thenReturn(List.of(1L));
		when(projectRepository.findById(42L)).thenReturn(Optional.empty());
		when(notificationRepository.existsByRecipientIdAndTypeAndReferenceType(
				eq(1L), eq(NotificationType.NEGATIVE_MARGIN_ALERT), any())).thenReturn(true);

		service.evaluateAndAlert(42L, marginOf(new BigDecimal("0.1000")));

		verify(notificationService, never()).sendInAppNotification(anyLong(), any(), any(), any(), any(), any());
	}

	@Test
	@DisplayName("Dat nguong voi gia tri null thi bao VALIDATION_ERROR")
	void rejectsBlankThreshold() {
		assertThatThrownBy(() -> service.setThreshold(new MarginThresholdReq(null)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("NCL-09-CN-004-TC-04: dat nguong thanh cong thi luu va ghi nhat ky he thong")
	void setsThresholdAndRecordsAuditLog() {
		when(marginThresholdSettingRepository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());
		when(marginThresholdSettingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

		MarginAlertRes result = service.setThreshold(new MarginThresholdReq(new BigDecimal("0.1500")));

		assertThat(result.minMarginRate()).isEqualByComparingTo("0.1500");
		verify(auditLogService).record(org.mockito.ArgumentMatchers.anyString(), any(), eq(null),
				org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
	}

	@Test
	@DisplayName("Chua tung dat nguong thi getThreshold tra ve cac truong null")
	void returnsNullFieldsWhenThresholdNeverConfigured() {
		when(marginThresholdSettingRepository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());

		MarginAlertRes result = service.getThreshold();

		assertThat(result.minMarginRate()).isNull();
	}
}
