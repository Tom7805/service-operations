package com.serviceops.modules.identity.user.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.user.dto.request.CreateUserReq;
import com.serviceops.modules.identity.user.dto.request.UpdateUserReq;
import com.serviceops.modules.identity.user.dto.request.UserStatusReq;
import com.serviceops.modules.identity.user.dto.response.AssignableProjectManagerRes;
import com.serviceops.modules.identity.user.dto.response.UserLookupRes;
import com.serviceops.modules.identity.user.dto.response.UserRes;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.entity.UserRoleScope;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.RoleRepository;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.identity.user.service.UserService;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import com.serviceops.security.scope.DataScopeType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<UserLookupRes> lookupActive() {
        return userRepository.findByStatusOrderByFullNameAsc(UserStatus.ACTIVE).stream()
                .map(u -> new UserLookupRes(u.getId(), u.getFullName()))
                .toList();
    }

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
        ensureDepartmentExists(request.departmentId());
        User user = new User();
        user.setUsername(request.username().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setEmail(normalize(request.email()));
        user.setDepartmentId(request.departmentId());
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);
        replaceRoles(user, request.roleCodes(), request.scopeType(), request.scopeDepartmentId());
        log.info("USER_CREATED userId={} username={}", user.getId(), user.getUsername());
        auditLogService.record("Tạo tài khoản", AuditTargetType.USER, user.getId(), user.getUsername(),
            "Tạo tài khoản cho " + user.getFullName());
        return toResponse(user);
    }

    @Override
    public UserRes update(Long id, UpdateUserReq request) {
        User user = getUser(id);
        ensureDepartmentExists(request.departmentId());
        boolean profileChanged = !Objects.equals(user.getFullName(), request.fullName().trim())
                || !Objects.equals(user.getEmail(), normalize(request.email()))
                || !Objects.equals(user.getDepartmentId(), request.departmentId());
        user.setFullName(request.fullName().trim());
        user.setEmail(normalize(request.email()));
        user.setDepartmentId(request.departmentId());
        boolean passwordReset = request.password() != null && !request.password().isBlank();
        if (passwordReset) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            // Quan tri vien dat lai mat khau thi cac phien dang mo bang mat khau cu phai cham dut.
            user.bumpTokenVersion();
        }

        // Form "Sua tai khoan" luon gui lai danh sach vai tro nhung khong gui pham vi du lieu: khi do phai
        // GIU NGUYEN pham vi dang co, khong duoc am tham doi ve COMPANY (mo rong quyen ngoai y muon).
        List<UserRoleScope> currentScopes = userRoleScopeRepository.findByUser_Id(user.getId());
        String currentScopeType = currentScopes.isEmpty() ? null : currentScopes.get(0).getScopeType();
        Long currentScopeDepartmentId = currentScopes.isEmpty() ? null : currentScopes.get(0).getScopeDepartmentId();
        boolean scopeProvided = request.scopeType() != null && !request.scopeType().isBlank();
        String targetScopeType = scopeProvided ? request.scopeType() : currentScopeType;
        Long targetScopeDepartmentId = scopeProvided ? request.scopeDepartmentId() : currentScopeDepartmentId;

        boolean roleScopeChanged = false;
        if (request.roleCodes() != null && !request.roleCodes().isEmpty()) {
            Set<String> currentRoles = currentScopes.stream().map(s -> s.getRole().getCode()).collect(Collectors.toSet());
            Set<String> targetRoles = request.roleCodes().stream().map(String::trim).collect(Collectors.toSet());
            DataScopeType currentType = DataScopeType.fromCode(currentScopeType);
            DataScopeType targetType = DataScopeType.fromCode(targetScopeType);
            roleScopeChanged = !currentRoles.equals(targetRoles)
                    || currentType != targetType
                    || (targetType == DataScopeType.DEPARTMENT
                        && !Objects.equals(currentScopeDepartmentId, targetScopeDepartmentId));
            if (roleScopeChanged) {
                replaceRoles(user, request.roleCodes(), targetScopeType, targetScopeDepartmentId);
            }
        }
        log.info("USER_UPDATED userId={} username={}", user.getId(), user.getUsername());
        UserRes result = toResponse(userRepository.save(user));
        if (roleScopeChanged) {
            auditLogService.record("Cấu hình phân quyền", AuditTargetType.ROLE_SCOPE, user.getId(), user.getUsername(),
                "Gán vai trò [" + roleNames(request.roleCodes()) + "] với phạm vi "
                    + scopeLabel(targetScopeType, targetScopeDepartmentId));
        }
        if (profileChanged || passwordReset || !roleScopeChanged) {
            auditLogService.record("Cập nhật tài khoản", AuditTargetType.USER, user.getId(), user.getUsername(),
                "Cập nhật thông tin tài khoản " + user.getFullName()
                    + (passwordReset ? " (đặt lại mật khẩu, các phiên đăng nhập cũ bị chấm dứt)" : ""));
        }
        return result;
    }

    @Override
    public UserRes updateStatus(Long id, UserStatusReq request) {
        User user = getUser(id);
        if (user.getStatus() == request.status()) {
            // NCL-01-CN-002-TC-03: khoa lai tai khoan dang bi khoa -> bao ro "da bi khoa".
            throw new BusinessRuleException(ErrorCode.INVALID_STATE, switch (request.status()) {
                case LOCKED -> "Tài khoản đã bị khóa.";
                case ACTIVE -> "Tài khoản đang hoạt động, không cần mở khóa.";
                case INACTIVE -> "Tài khoản đã ngừng hoạt động.";
            });
        }
        UserStatus previousStatus = user.getStatus();
        user.setStatus(request.status());
        if (request.status() == UserStatus.ACTIVE) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
        } else {
            // Khoa tai khoan phai cham dut ngay cac phien dang mo: JwtAuthFilter chi chap nhan token cung
            // tokenVersion, nen mo khoa lai thi nguoi dung cung phai dang nhap lai.
            user.bumpTokenVersion();
        }
        log.info("USER_STATUS_CHANGED userId={} username={} status={}", user.getId(), user.getUsername(), request.status());
        auditLogService.record(
            request.status() == UserStatus.LOCKED ? "Khóa tài khoản" : "Mở khóa tài khoản",
            AuditTargetType.USER, user.getId(), user.getUsername(),
            "Đổi trạng thái tài khoản từ " + previousStatus + " sang " + request.status());
        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignableProjectManagerRes> findAssignableProjectManagers() {
        return userRepository.findByStatusOrderByFullNameAsc(UserStatus.ACTIVE).stream()
                .map(user -> new AssignableProjectManagerRes(user.getId(), user.getUsername(), user.getFullName()))
                .toList();
    }

    private void replaceRoles(User user, List<String> roleCodes, String scopeType, Long scopeDepartmentId) {
        DataScopeType type = DataScopeType.fromCode(scopeType);
        if (type == null) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                    "Pham vi du lieu khong hop le, chi chap nhan COMPANY, DEPARTMENT hoac SELF");
        }
        Long resolvedScopeDepartmentId;
        if (type == DataScopeType.DEPARTMENT) {
            if (scopeDepartmentId == null) {
                throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                        "Phai chon bo phan khi pham vi la mot nhanh to chuc");
            }
            if (!departmentRepository.existsById(scopeDepartmentId)) {
                throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay bo phan cho pham vi da chon");
            }
            resolvedScopeDepartmentId = scopeDepartmentId;
        } else {
            resolvedScopeDepartmentId = null;
        }

        userRoleScopeRepository.deleteByUserId(user.getId());
        userRoleScopeRepository.flush();
        for (String roleCode : roleCodes) {
            Role role = roleRepository.findByCode(roleCode.trim())
                    .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay vai tro " + roleCode));
            UserRoleScope scope = new UserRoleScope();
            scope.setUser(user);
            scope.setRole(role);
            scope.setScopeType(type.name());
            scope.setScopeDepartmentId(resolvedScopeDepartmentId);
            userRoleScopeRepository.save(scope);
        }
        log.info("USER_ROLE_SCOPE_CHANGED userId={} roles={} scopeType={} scopeDepartmentId={}",
                user.getId(), roleCodes, type.name(), resolvedScopeDepartmentId);
    }

    /** Đổi danh sách mã vai trò sang tên tiếng Việt để ghi vào nhật ký (không hiển thị mã cho người dùng). */
    private String roleNames(List<String> roleCodes) {
        if (roleCodes == null || roleCodes.isEmpty()) {
            return "";
        }
        return roleCodes.stream()
                .map(code -> roleRepository.findByCode(code.trim())
                        .map(Role::getName)
                        .orElse(code))
                .collect(java.util.stream.Collectors.joining(", "));
    }

    private void ensureDepartmentExists(Long departmentId) {
        if (departmentId != null && !departmentRepository.existsById(departmentId)) {
            throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy bộ phận đã chọn");
        }
    }

    private String scopeLabel(String scopeType, Long scopeDepartmentId) {
        DataScopeType type = DataScopeType.fromCode(scopeType);
        if (type == DataScopeType.DEPARTMENT) {
            String name = scopeDepartmentId == null ? null
                    : departmentRepository.findById(scopeDepartmentId).map(d -> d.getName()).orElse(null);
            return "một nhánh tổ chức" + (name != null ? " (" + name + ")" : "");
        }
        return type == DataScopeType.SELF ? "chỉ dữ liệu cá nhân" : "toàn công ty";
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay tai khoan"));
    }

    private UserRes toResponse(User user) {
        List<UserRoleScope> scopes = userRoleScopeRepository.findByUser_Id(user.getId());
        String scopeType = scopes.isEmpty() ? null : scopes.get(0).getScopeType();
        Long scopeDepartmentId = scopes.isEmpty() ? null : scopes.get(0).getScopeDepartmentId();
        List<String> roleCodes = scopes.stream().map(s -> s.getRole().getCode()).toList();
        return new UserRes(user.getId(), user.getUsername(), user.getFullName(), user.getEmail(), user.getDepartmentId(),
                user.getStatus(), roleCodes, scopeType, scopeDepartmentId, user.getCreatedAt(), user.getUpdatedAt());
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
