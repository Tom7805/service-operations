package com.serviceops.security;

import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.security.scope.UserScope;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class CustomUserDetails implements UserDetails {

    private final Long id;
    private final String username;
    private final String passwordHash;
    private final boolean enabled;
    private final List<String> roleCodes;
    private final Long departmentId;
    private final UserScope scope;
    private final int tokenVersion;

    public CustomUserDetails(User user, List<String> roleCodes, UserScope scope) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.passwordHash = user.getPasswordHash();
        this.enabled = user.getStatus() == UserStatus.ACTIVE;
        this.roleCodes = roleCodes;
        this.departmentId = user.getDepartmentId();
        this.scope = scope;
        this.tokenVersion = user.getTokenVersion();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roleCodes.stream().map(code -> new SimpleGrantedAuthority("ROLE_" + code)).toList();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
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
