package com.serviceops.security.scope;

import com.serviceops.modules.identity.department.service.DepartmentService;
import com.serviceops.modules.identity.user.entity.UserRoleScope;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Tinh pham vi du lieu hieu luc cua mot tai khoan tu cac dong user_role_scopes cua ho (QTN-01).
 * Duoc goi lai moi request (khong luu vao JWT) de dam bao thay doi phan quyen
 * ap dung ngay lan thao tac ke tiep (NCL-01-CN-004-TC-03).
 */
@Service
@RequiredArgsConstructor
public class UserScopeService {

    private final UserRoleScopeRepository userRoleScopeRepository;
    private final DepartmentService departmentService;

    public UserScope resolve(Long userId) {
        List<UserRoleScope> scopes = userRoleScopeRepository.findByUser_Id(userId);
        if (scopes.isEmpty()) {
            return new UserScope(DataScopeType.SELF, Set.of());
        }

        boolean hasCompanyScope = scopes.stream()
                .anyMatch(s -> DataScopeType.fromCode(s.getScopeType()) == DataScopeType.COMPANY);
        if (hasCompanyScope) {
            return UserScope.company();
        }

        Set<Long> departmentIds = new HashSet<>();
        boolean hasDepartmentScope = false;
        for (UserRoleScope scope : scopes) {
            if (DataScopeType.fromCode(scope.getScopeType()) == DataScopeType.DEPARTMENT
                    && scope.getScopeDepartmentId() != null) {
                hasDepartmentScope = true;
                departmentIds.addAll(departmentService.collectDescendantIds(scope.getScopeDepartmentId()));
            }
        }
        if (hasDepartmentScope) {
            return new UserScope(DataScopeType.DEPARTMENT, departmentIds);
        }

        return new UserScope(DataScopeType.SELF, Set.of());
    }
}
