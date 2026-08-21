package com.serviceops.modules.identity.department.service.impl;

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
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DepartmentServiceImpl implements DepartmentService {
	private final DepartmentRepository departmentRepository;
	private final UserRepository userRepository;
	private final DepartmentMapper departmentMapper;
	private final DepartmentCycleValidator cycleValidator;

	@Override
	@Transactional(readOnly = true)
	public List<DepartmentRes> findAll(String keyword) {
		String normalizedKeyword = keyword == null ? null : keyword.trim().toLowerCase();
		return departmentRepository.findAllByOrderByNameAsc().stream()
				.filter(department -> normalizedKeyword == null || normalizedKeyword.isBlank()
						|| department.getName().toLowerCase().contains(normalizedKeyword))
				.map(departmentMapper::toResponse).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<DepartmentTreeRes> findTree() {
		List<Department> departments = departmentRepository.findAllByOrderByNameAsc();
		Map<Long, List<Department>> childrenByParent = departments.stream()
				.filter(department -> department.getParent() != null)
				.collect(Collectors.groupingBy(department -> department.getParent().getId()));
		return departments.stream().filter(department -> department.getParent() == null)
				.map(department -> toTree(department, childrenByParent)).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public DepartmentRes findById(Long id) {
		return departmentMapper.toResponse(getDepartment(id));
	}

	@Override
	public DepartmentRes create(DepartmentCreateReq request) {
		String name = request.name().trim();
		ensureUniqueName(name, request.parentId(), null);
		Department department = new Department();
		department.setName(name);
		department.setParent(findParent(request.parentId()));
		department.setManager(getManager(request.managerId()));
		return departmentMapper.toResponse(departmentRepository.save(department));
	}

	@Override
	public DepartmentRes update(Long id, DepartmentUpdateReq request) {
		Department department = getDepartment(id);
		cycleValidator.validate(id, request.parentId());
		ensureUniqueName(request.name().trim(), request.parentId(), id);
		department.setName(request.name().trim());
		department.setParent(findParent(request.parentId()));
		department.setManager(getManager(request.managerId()));
		return departmentMapper.toResponse(departmentRepository.save(department));
	}

	@Override
	public DepartmentRes move(Long id, DepartmentMoveReq request) {
		Department department = getDepartment(id);
		cycleValidator.validate(id, request.parentId());
		ensureUniqueName(department.getName(), request.parentId(), id);
		department.setParent(findParent(request.parentId()));
		return departmentMapper.toResponse(departmentRepository.save(department));
	}

	@Override
	public void delete(Long id) {
		Department department = getDepartment(id);
		if (departmentRepository.findByParentId(id).stream().findAny().isPresent()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Khong the xoa bo phan dang co bo phan con");
		}
		if (userRepository.countByDepartmentId(id) > 0) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Khong the xoa bo phan dang duoc su dung");
		}
		departmentRepository.delete(department);
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
		return userRepository.findById(managerId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay nguoi quan ly"));
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
