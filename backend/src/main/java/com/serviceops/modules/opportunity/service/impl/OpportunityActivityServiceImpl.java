package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.opportunity.dto.request.ActivityCreateReq;
import com.serviceops.modules.opportunity.dto.response.ActivityRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.entity.OpportunityActivity;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.mapper.OpportunityActivityMapper;
import com.serviceops.modules.opportunity.repository.OpportunityActivityRepository;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.OpportunityActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * NCL-03-CN-006: Ghi nhan hoat dong cham soc co hoi (goi dien, gap mat, thu
 * dien tu...) — moi hoat dong gan voi mot co hoi cu the, tao thanh dong thoi
 * gian cham soc cua co hoi do (TC-01). Chi co hoi con o trang thai
 * {@link OpportunityStatus#OPEN} moi duoc them hoat dong moi; co hoi da dong
 * ({@link OpportunityStatus#CLOSED}, tuc da WON hoac LOST — xem
 * {@code NCL-03-CN-002}/{@code 005}) chi con xem lai lich su (TC-02).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OpportunityActivityServiceImpl implements OpportunityActivityService {

	private final OpportunityRepository opportunityRepository;
	private final OpportunityActivityRepository opportunityActivityRepository;
	private final OpportunityActivityMapper opportunityActivityMapper;
	private final OpportunityAuditLogger auditLogger;

	@Override
	public List<ActivityRes> listByOpportunity(Long opportunityId) {
		requireOpportunityExists(opportunityId);
		return opportunityActivityRepository.findByOpportunityIdOrderByOccurredAtDescIdDesc(opportunityId).stream()
				.map(opportunityActivityMapper::toResponse)
				.toList();
	}

	@Override
	public ActivityRes addActivity(Long opportunityId, ActivityCreateReq request) {
		Opportunity opportunity = opportunityRepository.findById(opportunityId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay co hoi"));

		// TC-02: co hoi da dong (khac OPEN) thi chi con xem lai lich su, khong duoc them hoat dong moi.
		if (opportunity.getStatus() != OpportunityStatus.OPEN) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Co hoi da dong, chi co the xem lai lich su cham soc, khong the them hoat dong moi");
		}

		String content = request.content().trim();
		if (content.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Noi dung trao doi khong duoc de trong");
		}

		OpportunityActivity activity = new OpportunityActivity();
		activity.setOpportunityId(opportunityId);
		activity.setActivityType(request.activityType());
		activity.setOccurredAt(request.occurredAt());
		activity.setParticipants(blankToNull(request.participants()));
		activity.setContent(content);
		activity.setCreatedBy(currentUsername());
		activity.setCreatedAt(LocalDateTime.now());

		OpportunityActivity saved = opportunityActivityRepository.save(activity);

		// TC-04: moi lan them hoat dong thanh cong deu ghi lai nguoi thuc hien, noi dung va thoi diem.
		auditLogger.recordActivityAdd(opportunityId, "Ghi nhan hoat dong cham soc loai " + saved.getActivityType());

		log.info("OPPORTUNITY_ACTIVITY_ADDED opportunityId={} activityId={} type={}", opportunityId, saved.getId(),
				saved.getActivityType());
		return opportunityActivityMapper.toResponse(saved);
	}

	private void requireOpportunityExists(Long opportunityId) {
		if (!opportunityRepository.existsById(opportunityId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay co hoi");
		}
	}

	private String blankToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
