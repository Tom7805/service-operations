package com.serviceops.modules.identity.department.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.department.dto.request.DepartmentCreateReq;
import com.serviceops.modules.identity.department.dto.request.DepartmentMoveReq;
import com.serviceops.modules.identity.department.dto.request.DepartmentUpdateReq;
import com.serviceops.modules.identity.department.dto.response.DepartmentRes;
import com.serviceops.modules.identity.department.dto.response.DepartmentTreeRes;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.department.mapper.DepartmentMapper;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import com.serviceops.modules.identity.department.service.DepartmentService;
import com.serviceops.modules.identity.department.validator.DepartmentCycleValidator;
import com.serviceops.modules.identity.department.validator.DepartmentHierarchyValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.UserScope;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class DepartmentServiceImpl implements DepartmentService {
	private final DepartmentRepository departmentRepository;
	private final UserRepository userRepository;
	private final DepartmentMapper departmentMapper;
	private final DepartmentCycleValidator cycleValidator;
	private final DepartmentHierarchyValidator hierarchyValidator;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final AuditLogService auditLogService;

	@Override
	@Transactional(readOnly = true)
	public List<DepartmentRes> findAll(String keyword) {
		String normalizedKeyword = keyword == null ? null : keyword.trim().toLowerCase();
		UserScope scope = currentUserScopeProvider.currentScope();
		return departmentRepository.findAllByOrderByNameAsc().stream()
				.filter(department -> normalizedKeyword == null || normalizedKeyword.isBlank()
						|| department.getName().toLowerCase().contains(normalizedKeyword))
				.filter(department -> scope.allowsDepartment(department.getId()))
				.map(departmentMapper::toResponse).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<DepartmentTreeRes> findTree() {
		UserScope scope = currentUserScopeProvider.currentScope();
		List<Department> departments = departmentRepository.findAllByOrderByNameAsc().stream()
				.filter(department -> scope.allowsDepartment(department.getId()))
				.toList();
		Set<Long> visibleIds = departments.stream().map(Department::getId).collect(Collectors.toSet());
		Map<Long, List<Department>> childrenByParent = departments.stream()
				.filter(department -> department.getParent() != null && visibleIds.contains(department.getParent().getId()))
				.collect(Collectors.groupingBy(department -> department.getParent().getId()));
		return departments.stream()
				.filter(department -> department.getParent() == null || !visibleIds.contains(department.getParent().getId()))
				.map(department -> toTree(department, childrenByParent)).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public DepartmentRes findById(Long id) {
		Department department = getDepartment(id);
		UserScope scope = currentUserScopeProvider.currentScope();
		if (!scope.allowsDepartment(id)) {
			log.warn("ACCESS_DENIED userId={} departmentId={} reason=OUT_OF_SCOPE", currentUserScopeProvider.currentUserId(), id);
			throw new BusinessRuleException(ErrorCode.FORBIDDEN, "Ban khong co quyen xem bo phan nay");
		}
		return departmentMapper.toResponse(department);
	}

	@Override
	@Transactional(readOnly = true)
	public Set<Long> collectDescendantIds(Long departmentId) {
		Set<Long> result = new HashSet<>();
		if (departmentId == null) {
			return result;
		}
		result.add(departmentId);
		List<Department> children = departmentRepository.findByParentId(departmentId);
		for (Department child : children) {
			result.addAll(collectDescendantIds(child.getId()));
		}
		return result;
	}

	@Override
	public DepartmentRes create(DepartmentCreateReq request) {
		String name = request.name().trim();
		ensureUniqueName(name, request.parentId(), null);
		hierarchyValidator.validate(request.unitType(), request.parentId());
		Department department = new Department();
		department.setName(name);
		department.setParent(findParent(request.parentId()));
		department.setManager(getManager(request.managerId()));
		department.setType(request.unitType());
		Department saved = departmentRepository.save(department);
		// NCL-01-CN-003-TC-05: moi thay doi cau truc to chuc deu de lai dau vet.
		auditLogService.record("Tạo bộ phận", AuditTargetType.DEPARTMENT, saved.getId(), saved.getName(),
				"Tạo " + unitLabel(saved) + " \"" + saved.getName() + "\" thuộc " + parentLabel(saved.getParent())
						+ ", người quản lý: " + managerLabel(saved.getManager()));
		return departmentMapper.toResponse(saved);
	}

	@Override
	public DepartmentRes update(Long id, DepartmentUpdateReq request) {
		Department department = getDepartment(id);
		cycleValidator.validate(id, request.parentId());
		ensureUniqueName(request.name().trim(), request.parentId(), id);
		hierarchyValidator.validate(request.unitType(), request.parentId());
		String before = describe(department);
		department.setName(request.name().trim());
		department.setParent(findParent(request.parentId()));
		department.setManager(getManager(request.managerId()));
		department.setType(request.unitType());
		Department saved = departmentRepository.save(department);
		auditLogService.record("Cập nhật bộ phận", AuditTargetType.DEPARTMENT, saved.getId(), saved.getName(),
				"Trước: " + before + ". Sau: " + describe(saved) + ".");
		return departmentMapper.toResponse(saved);
	}

	@Override
	public DepartmentRes move(Long id, DepartmentMoveReq request) {
		Department department = getDepartment(id);
		cycleValidator.validate(id, request.parentId());
		ensureUniqueName(department.getName(), request.parentId(), id);
		hierarchyValidator.validate(department.getType(), request.parentId());
		String fromParent = parentLabel(department.getParent());
		department.setParent(findParent(request.parentId()));
		Department saved = departmentRepository.save(department);
		auditLogService.record("Di chuyển bộ phận", AuditTargetType.DEPARTMENT, saved.getId(), saved.getName(),
				"Chuyển \"" + saved.getName() + "\" từ " + fromParent + " sang " + parentLabel(saved.getParent()));
		return departmentMapper.toResponse(saved);
	}

	@Override
	public void delete(Long id) {
		Department department = getDepartment(id);
		if (departmentRepository.findByParentId(id).stream().findAny().isPresent()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Không thể xóa bộ phận đang có bộ phận con");
		}
		if (userRepository.countByDepartmentId(id) > 0) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Không thể xóa bộ phận đang có nhân sự trực thuộc");
		}
		String description = describe(department);
		departmentRepository.delete(department);
		auditLogService.record("Xóa bộ phận", AuditTargetType.DEPARTMENT, id, department.getName(),
				"Xóa bộ phận: " + description);
	}

	private String describe(Department department) {
		return unitLabel(department) + " \"" + department.getName() + "\" thuộc " + parentLabel(department.getParent())
				+ ", người quản lý " + managerLabel(department.getManager());
	}

	private static String unitLabel(Department department) {
		if (department.getType() == null) {
			return "bộ phận";
		}
		return switch (department.getType()) {
			case TRUNG_TAM -> "Trung tâm";
			case BAN -> "Ban";
			case PHONG -> "Phòng";
			case TO -> "Tổ/Nhóm";
		};
	}

	private static String parentLabel(Department parent) {
		return parent == null ? "gốc cây tổ chức" : "\"" + parent.getName() + "\"";
	}

	private static String managerLabel(User manager) {
		return manager == null ? "(chưa có)" : manager.getFullName() + " (@" + manager.getUsername() + ")";
	}

	private DepartmentTreeRes toTree(Department department, Map<Long, List<Department>> childrenByParent) {
		List<DepartmentTreeRes> children = childrenByParent.getOrDefault(department.getId(), List.of()).stream()
				.map(child -> toTree(child, childrenByParent)).toList();
		return departmentMapper.toTreeResponse(department, children);
	}

	private Department getDepartment(Long id) {
		return departmentRepository.findById(id)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay bo phan"));
	}

	private Department findParent(Long parentId) {
		return parentId == null ? null : getDepartment(parentId);
	}

	private User getManager(Long managerId) {
		User manager = userRepository.findById(managerId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy người quản lý"));
		if (manager.getStatus() != UserStatus.ACTIVE) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Người quản lý đã bị khóa tài khoản, vui lòng chọn người khác");
		}
		return manager;
	}

	private void ensureUniqueName(String name, Long parentId, Long currentId) {
		List<Department> siblings = parentId == null
				? departmentRepository.findByParentIsNull()
				: departmentRepository.findByParentId(parentId);
		if (siblings.stream().anyMatch(sibling -> !sibling.getId().equals(currentId)
				&& sibling.getName().equalsIgnoreCase(name))) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Ten bo phan da ton tai trong cung cap");
		}
	}
}
