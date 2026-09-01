package com.serviceops.common.audit.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.dto.AuditLogPageRes;
import com.serviceops.common.audit.dto.AuditLogRes;
import com.serviceops.common.audit.dto.AuditLogSearchReq;
import com.serviceops.common.audit.entity.AuditLog;
import com.serviceops.common.audit.repository.AuditLogRepository;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.audit.specification.AuditLogSpecification;
import com.serviceops.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Ghi và tra cứu nhật ký thao tác nghiệp vụ tổng hợp. Thay cho các danh sách "nhật ký" giả lập chỉ
 * tồn tại tạm thời trên trình duyệt ở từng trang trước đây (Tài khoản, Phân quyền...).
 */
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

	private final AuditLogRepository repository;

	/**
	 * Ghi độc lập transaction riêng ({@code REQUIRES_NEW}): một thao tác nghiệp vụ dù thành công hay
	 * đang trong transaction bị rollback ở lớp gọi vẫn không được kéo bản ghi nhật ký theo — nhật ký
	 * chỉ được gọi sau khi thao tác chính đã thành công, nhưng tách transaction để chắc chắn an toàn.
	 */
	@Override
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void record(String action, AuditTargetType targetType, Long targetId, String targetLabel, String detail) {
		AuditLog log = new AuditLog();
		log.setAction(action);
		log.setTargetType(targetType);
		log.setTargetId(targetId);
		log.setTargetLabel(targetLabel);
		log.setDetail(detail);
		log.setPerformedAt(LocalDateTime.now());
		currentUser().ifPresent(user -> {
			log.setActorUserId(user.getId());
			log.setActorUsername(user.getUsername());
		});
		repository.save(log);
	}

	@Override
	@Transactional(readOnly = true)
	public AuditLogPageRes search(AuditLogSearchReq request) {
		Specification<AuditLog> spec = AuditLogSpecification.from(request);
		PageRequest pageRequest = PageRequest.of(request.getPage(), request.getSize(),
			Sort.by(Sort.Direction.DESC, "performedAt"));

		Page<AuditLog> page = repository.findAll(spec, pageRequest);
		List<AuditLogRes> content = page.getContent().stream().map(this::toResponse).toList();

		return new AuditLogPageRes(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
	}

	private AuditLogRes toResponse(AuditLog log) {
		return new AuditLogRes(log.getId(), log.getActorUserId(), log.getActorUsername(), log.getAction(),
			log.getTargetType(), log.getTargetId(), log.getTargetLabel(), log.getDetail(), log.getPerformedAt());
	}

	private Optional<CustomUserDetails> currentUser() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails user)) {
			return Optional.empty();
		}
		return Optional.of(user);
	}
}
