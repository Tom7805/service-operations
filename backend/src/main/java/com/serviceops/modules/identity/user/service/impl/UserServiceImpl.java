package com.serviceops.modules.identity.user.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.user.dto.request.CreateUserReq;
import com.serviceops.modules.identity.user.dto.request.UpdateUserReq;
import com.serviceops.modules.identity.user.dto.request.UserStatusReq;
import com.serviceops.modules.identity.user.dto.response.UserRes;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.entity.UserRoleScope;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.RoleRepository;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.identity.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<UserRes> findAll(String keyword) {
        List<User> users = keyword == null || keyword.isBlank()
                ? userRepository.findAll()
                : userRepository.findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(keyword.trim(), keyword.trim());
        return users.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UserRes findById(Long id) {
        return toResponse(getUser(id));
    }

    @Override
    public UserRes create(CreateUserReq request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username().trim())) {
            throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Ten tai khoan da ton tai");
        }
        User user = new User();
        user.setUsername(request.username().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setEmail(normalize(request.email()));
        user.setDepartmentId(request.departmentId());
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);
        replaceRoles(user, request.roleCodes(), request.scopeType());
        log.info("USER_CREATED userId={} username={}", user.getId(), user.getUsername());
        return toResponse(user);
    }

    @Override
    public UserRes update(Long id, UpdateUserReq request) {
        User user = getUser(id);
        user.setFullName(request.fullName().trim());
        user.setEmail(normalize(request.email()));
        user.setDepartmentId(request.departmentId());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        if (request.roleCodes() != null && !request.roleCodes().isEmpty()) {
            replaceRoles(user, request.roleCodes(), request.scopeType());
        }
        log.info("USER_UPDATED userId={} username={}", user.getId(), user.getUsername());
        return toResponse(userRepository.save(user));
    }

    @Override
    public UserRes updateStatus(Long id, UserStatusReq request) {
        User user = getUser(id);
        if (user.getStatus() == request.status()) {
            throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Tai khoan da o trang thai nay");
        }
        user.setStatus(request.status());
        if (request.status() == UserStatus.ACTIVE) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
        }
        log.info("USER_STATUS_CHANGED userId={} username={} status={}", user.getId(), user.getUsername(), request.status());
        return toResponse(userRepository.save(user));
    }

    private void replaceRoles(User user, List<String> roleCodes, String scopeType) {
        userRoleScopeRepository.deleteByUserId(user.getId());
        for (String roleCode : roleCodes) {
            Role role = roleRepository.findByCode(roleCode.trim())
                    .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay vai tro " + roleCode));
            UserRoleScope scope = new UserRoleScope();
            scope.setUser(user);
            scope.setRole(role);
            scope.setScopeType(scopeType == null || scopeType.isBlank() ? "COMPANY" : scopeType);
            userRoleScopeRepository.save(scope);
        }
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay tai khoan"));
    }

    private UserRes toResponse(User user) {
        return new UserRes(user.getId(), user.getUsername(), user.getFullName(), user.getEmail(), user.getDepartmentId(),
                user.getStatus(), userRoleScopeRepository.findRoleCodesByUserId(user.getId()), user.getCreatedAt(), user.getUpdatedAt());
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
