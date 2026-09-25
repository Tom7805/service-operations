package com.serviceops.modules.admin.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.admin.dto.request.ServiceCatalogReq;
import com.serviceops.modules.admin.dto.request.ServiceCatalogStatusReq;
import com.serviceops.modules.admin.dto.request.ServiceCatalogUpdateReq;
import com.serviceops.modules.admin.dto.request.ServicePriceReq;
import com.serviceops.modules.admin.dto.response.EffectivePriceRes;
import com.serviceops.modules.admin.dto.response.ServiceCatalogRes;
import com.serviceops.modules.admin.service.ServiceCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * NCL-15-CN-001 — Quan tri vien (VT-07) quan ly danh muc dich vu va gia. Vai tro khac nhan 403 va
 * {@code AccessDeniedAuditRecorder} ghi "Tu choi truy cap — Quản lý danh mục dịch vụ" (TC-03).
 *
 * <p>Ngoai le: hai API chi doc {@code /selectable} va {@code /{id}/effective-price} mo cho cac vai tro lap
 * bao gia / hoa don (kinh doanh, ke toan, quan ly du an, ban giam doc) — de ho dung chung danh muc chuan.</p>
 */
@RestController
@RequestMapping("/service-catalog")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class ServiceCatalogController {

	static final String CATALOG_READERS = "hasAnyRole('VT-07','VT-01','VT-02','VT-04','VT-05')";

	private final ServiceCatalogService serviceCatalogService;

	@GetMapping
	public BaseRes<List<ServiceCatalogRes>> search(@RequestParam(required = false) String keyword,
			@RequestParam(required = false) Boolean active,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
		return BaseRes.ok(serviceCatalogService.search(keyword, active, asOf));
	}

	/** QTN-28: dich vu dang hoat dong VA co gia hieu luc tai ngay lap — danh sach chon khi lap bao gia/hoa don. */
	@GetMapping("/selectable")
	@PreAuthorize(CATALOG_READERS)
	public BaseRes<List<ServiceCatalogRes>> listSelectable(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return BaseRes.ok(serviceCatalogService.listSelectable(date));
	}

	@GetMapping("/{id}")
	public BaseRes<ServiceCatalogRes> get(@PathVariable Long id,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
		return BaseRes.ok(serviceCatalogService.get(id, asOf));
	}

	/** QTN-28: gia ap dung tai ngay lap; thieu gia hieu luc thi 400 INVALID_STATE. */
	@GetMapping("/{id}/effective-price")
	@PreAuthorize(CATALOG_READERS)
	public BaseRes<EffectivePriceRes> effectivePrice(@PathVariable Long id,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return BaseRes.ok(serviceCatalogService.resolveEffectivePrice(id, date));
	}

	/** TC-01 / TC-02. */
	@PostMapping
	public BaseRes<ServiceCatalogRes> create(@Valid @RequestBody ServiceCatalogReq request) {
		return BaseRes.ok("Tao dich vu thanh cong", serviceCatalogService.create(request));
	}

	@PutMapping("/{id}")
	public BaseRes<ServiceCatalogRes> update(@PathVariable Long id, @Valid @RequestBody ServiceCatalogUpdateReq request) {
		return BaseRes.ok("Cap nhat dich vu thanh cong", serviceCatalogService.update(id, request));
	}

	@PatchMapping("/{id}/status")
	public BaseRes<ServiceCatalogRes> updateStatus(@PathVariable Long id,
			@Valid @RequestBody ServiceCatalogStatusReq request) {
		ServiceCatalogRes result = serviceCatalogService.updateStatus(id, request);
		return BaseRes.ok(Boolean.TRUE.equals(request.active()) ? "Mo lai dich vu thanh cong"
				: "Ngung dich vu thanh cong", result);
	}

	@PostMapping("/{id}/prices")
	public BaseRes<ServiceCatalogRes> addPrice(@PathVariable Long id, @Valid @RequestBody ServicePriceReq request) {
		return BaseRes.ok("Them moc gia thanh cong", serviceCatalogService.addPrice(id, request));
	}
}
