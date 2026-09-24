package com.serviceops.modules.acceptance.security;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Pham vi du lieu cua Epic NCL-12 (QTN-01). {@code @PreAuthorize} o controller da chan sai vai tro;
 * lop nay chan tiep truong hop dung vai tro nhung khac du an: Quan ly du an chi thao tac tren du an
 * minh phu trach. Nem {@link AccessDeniedException} de {@code GlobalExceptionHandler} tra 403 va ghi
 * nhat ky lan tu choi — cung cach {@code TimesheetAdjustmentServiceImpl} dang lam.
 */
@Component
@RequiredArgsConstructor
public class AcceptanceAccessGuard {

	private static final String ACCOUNTANT_AUTHORITY = "ROLE_VT-05";

	private final ProjectRepository projectRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;

	/** Du an ton tai va nguoi dung hien tai la Quan ly du an cua du an do. */
	public Project requireManagedProject(Long projectId) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi id=" + projectId));
		requireManager(project);
		return project;
	}

	public void requireManager(Project project) {
		Long userId = currentUserScopeProvider.currentUserId();
		if (userId == null || !userId.equals(project.getProjectManagerId())) {
			throw new AccessDeniedException("Du an khong thuoc pham vi quan ly cua nguoi dung");
		}
	}

	/** Ke toan xem duoc moi phieu (can de gan moc thanh toan); Quan ly du an chi xem du an minh. */
	public void requireReadable(Project project) {
		if (!isAccountant()) {
			requireManager(project);
		}
	}

	public boolean isAccountant() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication != null && authentication.getAuthorities().stream()
				.anyMatch(authority -> ACCOUNTANT_AUTHORITY.equals(authority.getAuthority()));
	}

	public Long currentUserId() {
		return currentUserScopeProvider.currentUserId();
	}
}
