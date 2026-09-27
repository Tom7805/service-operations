package com.serviceops.modules.acceptance.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.acceptance.dto.request.AcceptanceConfirmReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceCreateReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceMilestoneLinkReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceRejectReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceUpdateReq;
import com.serviceops.modules.acceptance.dto.response.AcceptanceCertificateRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceReadinessRes;
import com.serviceops.modules.acceptance.dto.response.MilestoneAcceptanceRes;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.service.AcceptanceCertificateService;
import com.serviceops.modules.acceptance.service.AcceptanceConfirmationService;
import com.serviceops.modules.acceptance.service.AcceptanceMilestoneLinkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Epic NCL-12 — phieu nghiem thu hang muc.
 *
 * <ul>
 *   <li>NCL-12-CN-001/002: Quan ly du an (VT-02) lap, nop lai, ghi nhan xac nhan/tu choi — chi tren du
 *       an minh phu trach (QTN-01).</li>
 *   <li>NCL-12-CN-003: Ke toan (VT-05) gan phieu voi moc thanh toan.</li>
 * </ul>
 * <p>Sai vai tro hoac khac du an nhan 403 va {@code AccessDeniedAuditRecorder} ghi "Tu choi truy cap" (TC-03).</p>
 */
@RestController
@RequiredArgsConstructor
public class AcceptanceCertificateController {

	private final AcceptanceCertificateService certificateService;
	private final AcceptanceConfirmationService confirmationService;
	private final AcceptanceMilestoneLinkService milestoneLinkService;

	/** CN-001: xem truoc hang muc da du dieu kien lap phieu chua, kem danh sach cong viec dang do (TC-02). */
	@GetMapping("/projects/{projectId}/work-packages/{workPackageId}/acceptance-readiness")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<AcceptanceReadinessRes> getReadiness(@PathVariable Long projectId,
			@PathVariable Long workPackageId) {
		return BaseRes.ok(certificateService.getReadiness(projectId, workPackageId));
	}

	/** CN-001 TC-01: lap phieu nghiem thu cho hang muc da hoan thanh. */
	@PostMapping("/projects/{projectId}/acceptances")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<AcceptanceDetailRes> create(@PathVariable Long projectId,
			@Valid @RequestBody AcceptanceCreateReq request) {
		return BaseRes.ok("Lap phieu nghiem thu thanh cong", certificateService.create(projectId, request));
	}

	@GetMapping("/projects/{projectId}/acceptances")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<AcceptanceCertificateRes>> listByProject(@PathVariable Long projectId) {
		return BaseRes.ok(certificateService.listByProject(projectId));
	}

	/** Tra cuu phieu: Ke toan thay tat ca (loc theo hop dong de gan moc), Quan ly du an chi du an minh. */
	@GetMapping("/acceptances")
	@PreAuthorize("hasRole('VT-02') or hasRole('VT-05')")
	public BaseRes<List<AcceptanceCertificateRes>> search(@RequestParam(required = false) Long contractId,
			@RequestParam(required = false) Long projectId,
			@RequestParam(required = false) AcceptanceStatus status) {
		return BaseRes.ok(certificateService.search(contractId, projectId, status));
	}

	@GetMapping("/acceptances/{certificateId}")
	@PreAuthorize("hasRole('VT-02') or hasRole('VT-05')")
	public BaseRes<AcceptanceDetailRes> getDetail(@PathVariable Long certificateId) {
		return BaseRes.ok(certificateService.getDetail(certificateId));
	}

	/** CN-002 TC-02: chinh sua va nop lai phieu sau khi khach hang tu choi. */
	@PutMapping("/acceptances/{certificateId}")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<AcceptanceDetailRes> resubmit(@PathVariable Long certificateId,
			@Valid @RequestBody AcceptanceUpdateReq request) {
		return BaseRes.ok("Nop lai phieu nghiem thu thanh cong", certificateService.resubmit(certificateId, request));
	}

	/** CN-002 TC-01: ghi nhan khach hang da xac nhan (kem bien ban mo phong). */
	@PostMapping("/acceptances/{certificateId}/confirm")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<AcceptanceDetailRes> confirm(@PathVariable Long certificateId,
			@Valid @RequestBody AcceptanceConfirmReq request) {
		return BaseRes.ok("Ghi nhan khach hang xac nhan nghiem thu thanh cong",
				confirmationService.confirm(certificateId, request));
	}

	/** CN-002 TC-02: ghi nhan khach hang tu choi kem ly do. */
	@PostMapping("/acceptances/{certificateId}/reject")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<AcceptanceDetailRes> reject(@PathVariable Long certificateId,
			@Valid @RequestBody AcceptanceRejectReq request) {
		return BaseRes.ok("Ghi nhan khach hang tu choi nghiem thu thanh cong",
				confirmationService.reject(certificateId, request));
	}

	/** CN-003 TC-01: gan phieu vao moc thanh toan cua hop dong. */
	@PutMapping("/acceptances/{certificateId}/payment-milestone")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<AcceptanceDetailRes> linkMilestone(@PathVariable Long certificateId,
			@Valid @RequestBody AcceptanceMilestoneLinkReq request) {
		return BaseRes.ok("Gan phieu nghiem thu voi moc thanh toan thanh cong",
				milestoneLinkService.link(certificateId, request));
	}

	@DeleteMapping("/acceptances/{certificateId}/payment-milestone")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<AcceptanceDetailRes> unlinkMilestone(@PathVariable Long certificateId) {
		return BaseRes.ok("Go phieu nghiem thu khoi moc thanh toan thanh cong",
				milestoneLinkService.unlink(certificateId));
	}

	/** CN-003: moc thanh toan cua hop dong kem phieu da gan va trang thai du dieu kien lap hoa don. */
	@GetMapping("/contracts/{contractId}/milestone-acceptances")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<MilestoneAcceptanceRes>> listMilestoneAcceptances(@PathVariable Long contractId) {
		return BaseRes.ok(milestoneLinkService.listForContract(contractId));
	}
}
