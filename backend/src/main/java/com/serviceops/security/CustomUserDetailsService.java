package com.serviceops.security;

import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.security.scope.UserScope;
import com.serviceops.security.scope.UserScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final UserScopeService userScopeService;

    @Override
    public CustomUserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Khong tim thay tai khoan: " + username));
        List<String> roleCodes = userRoleScopeRepository.findRoleCodesByUserId(user.getId());
        UserScope scope = userScopeService.resolve(user.getId());
        return new CustomUserDetails(user, roleCodes, scope);
    }
}
