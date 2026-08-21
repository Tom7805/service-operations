package com.serviceops.modules.identity.department.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.department.dto.request.DepartmentCreateReq;
import com.serviceops.modules.identity.department.dto.request.DepartmentMoveReq;
import com.serviceops.modules.identity.department.dto.request.DepartmentUpdateReq;
import com.serviceops.modules.identity.department.dto.response.DepartmentRes;
import com.serviceops.modules.identity.department.dto.response.DepartmentTreeRes;
import com.serviceops.modules.identity.department.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/departments")
@RequiredArgsConstructor
public class DepartmentController {
	private final DepartmentService departmentService;

	/** Doc cay to chuc: moi tai khoan da dang nhap deu xem duoc, nhung chi trong pham vi du lieu cua ho (QTN-01). */
	@GetMapping
	public BaseRes<List<DepartmentRes>> findAll(@RequestParam(required = false) String keyword) {
		return BaseRes.ok(departmentService.findAll(keyword));
	}

	@GetMapping("/tree")
	public BaseRes<List<DepartmentTreeRes>> findTree() {
		return BaseRes.ok(departmentService.findTree());
	}

	@GetMapping("/{id}")
	public BaseRes<DepartmentRes> findById(@PathVariable Long id) {
		return BaseRes.ok(departmentService.findById(id));
	}

	@PostMapping
	@PreAuthorize("hasRole('VT-07')")
	public BaseRes<DepartmentRes> create(@Valid @RequestBody DepartmentCreateReq request) {
		return BaseRes.ok("Tao bo phan thanh cong", departmentService.create(request));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('VT-07')")
	public BaseRes<DepartmentRes> update(@PathVariable Long id, @Valid @RequestBody DepartmentUpdateReq request) {
		return BaseRes.ok("Cap nhat bo phan thanh cong", departmentService.update(id, request));
	}

	@PatchMapping("/{id}/move")
	@PreAuthorize("hasRole('VT-07')")
	public BaseRes<DepartmentRes> move(@PathVariable Long id, @RequestBody DepartmentMoveReq request) {
		return BaseRes.ok("Di chuyen bo phan thanh cong", departmentService.move(id, request));
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('VT-07')")
	public BaseRes<Void> delete(@PathVariable Long id) {
		departmentService.delete(id);
		return BaseRes.ok("Xoa bo phan thanh cong", null);
	}
}
