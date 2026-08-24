package com.serviceops.security.scope;

import com.serviceops.security.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Doc pham vi du lieu (UserScope) cua tai khoan dang dang nhap tu SecurityContext hien tai.
 * UserScope duoc CustomUserDetailsService tinh lai tu DB o moi request (khong luu trong JWT),
 * nen day luon la pham vi moi nhat tai thoi diem goi (QTN-01-TC-03).
 */
@Component
public class CurrentUserScopeProvider {

    public UserScope currentScope() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails details)) {
            return new UserScope(DataScopeType.SELF, java.util.Set.of());
        }
        return details.getScope();
    }

    public Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails details)) {
            return null;
        }
        return details.getId();
    }
}
