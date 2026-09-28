package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Pham vi du lieu cua co hoi ban hang theo vai tro va cay to chuc (QTN-01).
 *
 * <p>Truoc day chi danh sach co hoi loc theo pham vi; bao cao du bao, bao cao duong ong
 * va cac thao tac tren mot co hoi cu the (chuyen giai doan, dong, bao gia, cham soc) van
 * lam viec tren TOAN BO du lieu — nguoi o pham vi SELF go id co hoi cua nguoi khac la sua
 * duoc. Thanh phan nay gom mot cach tinh pham vi duy nhat cho ca module:</p>
 * <ul>
 *   <li>COMPANY: luon qua.</li>
 *   <li>SELF: chi co hoi do chinh nguoi xem phu trach ({@code ownerId}).</li>
 *   <li>DEPARTMENT: co hoi co nguoi phu trach thuoc cac phong ban trong pham vi.</li>
 * </ul>
 * <p>Co hoi khong xac dinh nguoi phu trach bi loai khoi SELF lan DEPARTMENT — an toan hon
 * la lo nham cho nguoi khong lien quan.</p>
 */
@Component
@RequiredArgsConstructor
public class OpportunityScopeGuard {

	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final UserRepository userRepository;

	/** Loc danh sach co hoi theo pham vi cua nguoi dang dang nhap (mot truy van phong ban cho ca lo). */
	public List<Opportunity> filter(Collection<Opportunity> opportunities) {
		UserScope scope = currentUserScopeProvider.currentScope();
		if (scope == null || scope.isCompanyWide()) {
			return List.copyOf(opportunities);
		}
		if (scope.type() == DataScopeType.SELF) {
			Long me = currentUserScopeProvider.currentUserId();
			return opportunities.stream()
					.filter(o -> o.getOwnerId() != null && o.getOwnerId().equals(me))
					.toList();
		}
		if (scope.type() == DataScopeType.DEPARTMENT) {
			Map<Long, Long> departmentByOwner = ownerDepartments(opportunities);
			return opportunities.stream()
					.filter(o -> {
						Long departmentId = o.getOwnerId() == null ? null : departmentByOwner.get(o.getOwnerId());
						return departmentId != null && scope.departmentIds().contains(departmentId);
					})
					.toList();
		}
		return List.of();
	}

	/** Co hoi co nam trong pham vi cua nguoi dang dang nhap khong. */
	public boolean inScope(Opportunity opportunity) {
		return !filter(List.of(opportunity)).isEmpty();
	}

	/**
	 * QTN-01: mo mot co hoi ngoai pham vi (vd. go truc tiep id tren duong dan) bi tu choi.
	 * Nem {@link AccessDeniedException} de {@code GlobalExceptionHandler} tra 403 va
	 * {@code OpportunityAccessDeniedAspect} ghi nhat ky lan tu choi.
	 */
	public void requireInScope(Opportunity opportunity) {
		if (!inScope(opportunity)) {
			throw new AccessDeniedException("Co hoi nam ngoai pham vi du lieu duoc phan quyen");
		}
	}

	private Map<Long, Long> ownerDepartments(Collection<Opportunity> opportunities) {
		List<Long> ownerIds = opportunities.stream()
				.map(Opportunity::getOwnerId)
				.filter(Objects::nonNull)
				.distinct()
				.toList();
		if (ownerIds.isEmpty()) {
			return Map.of();
		}
		return userRepository.findAllById(ownerIds).stream()
				.filter(u -> u.getDepartmentId() != null)
				.collect(Collectors.toMap(User::getId, User::getDepartmentId, (a, b) -> a));
	}
}
