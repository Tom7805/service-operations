package com.serviceops.common.security;

import com.serviceops.modules.identity.user.entity.User;
import java.util.Collections;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Bọc {@link User} thành {@link UserDetails} cho Spring Security. Chưa gắn
 * vai trò/quyền chi tiết — việc đó thuộc phạm vi NCL-01-CN-004 (phân quyền
 * theo vai trò và phạm vi dữ liệu), sẽ mở rộng getAuthorities() khi triển khai.
 */
@Getter
public class UserPrincipal implements UserDetails {

    private final Long userId;
    private final String email;
    private final String fullName;
    private final String passwordHash;
    private final boolean enabled;

    public UserPrincipal(User user) {
        this.userId = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.passwordHash = user.getPasswordHash();
        this.enabled = user.getStatus() == com.serviceops.modules.identity.user.enums.UserStatus.ACTIVE;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public java.util.Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.emptyList();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return enabled;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
