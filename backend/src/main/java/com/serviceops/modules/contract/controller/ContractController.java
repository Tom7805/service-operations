package com.serviceops.modules.contract.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.contract.dto.request.ContractTypeLimitReq;
import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.service.ContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-04-CN-002: Khai bao loai hop dong va han muc.
 * Chi Ke toan (VT-05) duoc khai bao (TC-03) - ai khong co quyen se bi tu choi
 * (403) va duoc ghi nhat ky boi {@code ContractAccessDeniedAspect}.
 */
@RestController
@RequestMapping("/contracts")
@RequiredArgsConstructor
public class ContractController {

private final ContractService contractService;

/**
 * Khai bao loai hop dong (tron goi/theo gio/theo moc), gia tri va han muc tran
 * (NCL-04-CN-002, TC-01/02/04, QTN-19). Dieu kien bat dau: hop dong da duoc tao.
 */
@PatchMapping("/{contractId}/type-limit")
@PreAuthorize("hasRole('VT-05')")
public BaseRes<ContractRes> updateTypeAndLimit(@PathVariable Long contractId,
@Valid @RequestBody ContractTypeLimitReq request) {
return BaseRes.ok("Khai bao loai hop dong va han muc thanh cong",
contractService.updateTypeAndLimit(contractId, request));
}
}