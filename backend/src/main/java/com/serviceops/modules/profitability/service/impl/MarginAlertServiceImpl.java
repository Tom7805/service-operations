package com.serviceops.modules.profitability.service.impl;

import com.serviceops.common.audit.AuditTargetType;
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
import com.serviceops.modules.profitability.enums.AlertLevel;
import com.serviceops.modules.profitability.repository.MarginThresholdSettingRepository;
import com.serviceops.modules.profitability.service.MarginAlertService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Canh bao du an am bien (NCL-09-CN-004, QTN-21). Nguong la cau hinh toan cong ty; danh gia
 * duoc kich hoat moi lan {@code ProjectMarginService.calculateProjectMargin} duoc goi (xem
 * {@code ProjectProfitabilityController#getProjectMargin}) - dung mo hinh "tinh dong" da co
 * cua ca Epic NCL-09, khong dung them ha tang su kien (event) rieng.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MarginAlertServiceImpl implements MarginAlertService {

	private static final String BOARD_ROLE_CODE = "VT-01";

	private final MarginThresholdSettingRepository marginThresholdSettingRepository;
	private final ProjectRepository projectRepository;
	private final UserRoleScopeRepository userRoleScopeRepository;
	private final NotificationRepository notificationRepository;
	private final NotificationService notificationService;
	private final AuditLogService auditLogService;

	@Override
	@Transactional(readOnly = true)
	public MarginAlertRes getThreshold() {
		return marginThresholdSettingRepository.findTopByOrderByIdDesc()
				.map(this::toRes)
				.orElseGet(() -> new MarginAlertRes(null, null, null));
	}

	@Override
	public MarginAlertRes setThreshold(MarginThresholdReq request) {
		if (request == null || request.minMarginRate() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Nguong bien loi nhuan toi thieu khong duoc de trong");
		}

		MarginThresholdSetting setting = marginThresholdSettingRepository.findTopByOrderByIdDesc()
				.orElseGet(MarginThresholdSetting::new);
		setting.setMinMarginRate(request.minMarginRate());
		setting.setUpdatedBy(currentUsername());
		setting.setUpdatedAt(LocalDateTime.now());
		setting = marginThresholdSettingRepository.save(setting);

		// TC-04: luu lich su thay doi nguong canh bao am bien.
		auditLogService.record("Cap nhat nguong canh bao am bien", AuditTargetType.GENERAL, null,
				"Nguong bien loi nhuan toi thieu",
				"Doi nguong canh bao am bien thanh " + request.minMarginRate());

		return toRes(setting);
	}

	@Override
	public void evaluateAndAlert(Long projectId, ProjectMarginRes margin) {
		if (margin == null || margin.marginRate() == null) {
			// TC-02: du an chua phat sinh du lieu (doanh thu = 0, marginRate null) - bo qua.
			return;
		}

		MarginThresholdSetting setting = marginThresholdSettingRepository.findTopByOrderByIdDesc().orElse(null);
		if (setting == null || margin.marginRate().compareTo(setting.getMinMarginRate()) >= 0) {
			return;
		}

		AlertLevel level = margin.marginRate().signum() < 0 ? AlertLevel.NEGATIVE : AlertLevel.BELOW_THRESHOLD;
		String title = level == AlertLevel.NEGATIVE ? "Canh bao du an am bien" : "Canh bao bien loi nhuan duoi nguong";
		String content = String.format(
				"Du an #%d dang co bien loi nhuan %s%%, thap hon nguong toi thieu %s%%.",
				projectId,
				toPercentText(margin.marginRate()),
				toPercentText(setting.getMinMarginRate()));
		// Bucket theo ngay de khong gui lai nhieu lan trong cung mot ngay du bien loi nhuan
		// duoc doc lai nhieu lan (moi lan GET /margin la mot lan "tinh lai").
		String referenceType = "NegativeMarginAlert:" + projectId + ":" + LocalDate.now();

		for (Long recipientId : alertRecipients(projectId)) {
			if (notificationRepository.existsByRecipientIdAndTypeAndReferenceType(
					recipientId, NotificationType.NEGATIVE_MARGIN_ALERT, referenceType)) {
				continue;
			}
			notificationService.sendInAppNotification(recipientId, NotificationType.NEGATIVE_MARGIN_ALERT,
					title, content, projectId, referenceType);
		}
	}

	/** PM phu trach du an + toan bo Ban giam doc (TC-01), khong trung lap. */
	private List<Long> alertRecipients(Long projectId) {
		Set<Long> recipients = new LinkedHashSet<>(userRoleScopeRepository.findUserIdsByRoleCode(BOARD_ROLE_CODE));
		projectRepository.findById(projectId)
				.map(Project::getProjectManagerId)
				.ifPresent(recipients::add);
		return List.copyOf(recipients);
	}

	/** Ty le dang phan so (0.1500) -> "15.00" de thong bao khong hien "15.0000%". */
	private static String toPercentText(BigDecimal ratio) {
		return ratio.multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP).toPlainString();
	}

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth != null ? auth.getName() : null;
	}

	private MarginAlertRes toRes(MarginThresholdSetting setting) {
		return new MarginAlertRes(setting.getMinMarginRate(), setting.getUpdatedBy(), setting.getUpdatedAt());
	}
}
