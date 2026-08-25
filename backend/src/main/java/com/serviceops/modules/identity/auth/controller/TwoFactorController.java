package com.serviceops.modules.identity.auth.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorConfigReq;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorVerifyReq;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;
import com.serviceops.modules.identity.auth.dto.response.TwoFactorSetupRes;
import com.serviceops.modules.identity.auth.service.TwoFactorService;
import com.serviceops.security.CustomUserDetails;
import com.serviceops.security.TwoFactorRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/auth/two-factor")
@RequiredArgsConstructor
public class TwoFactorController {

	private final TwoFactorService twoFactorService;
	private final TwoFactorRateLimiter twoFactorRateLimiter;

	@PostMapping("/verify")
	public BaseRes<LoginRes> verify(@Valid @RequestBody TwoFactorVerifyReq request,
									 HttpServletRequest httpRequest) {
		twoFactorRateLimiter.check(httpRequest.getRemoteAddr(), request.getChallengeToken());
		return BaseRes.ok(twoFactorService.verifyTwoFactor(request));
	}

	@GetMapping("/configs")
	@PreAuthorize("hasRole('VT-07')")
	public BaseRes<List<TwoFactorSetupRes>> listConfigs() {
		return BaseRes.ok(twoFactorService.listConfigs());
	}

	@PatchMapping("/configs/{roleId}")
	@PreAuthorize("hasRole('VT-07')")
	public BaseRes<TwoFactorSetupRes> updateConfig(@PathVariable Long roleId,
													@Valid @RequestBody TwoFactorConfigReq request,
													Authentication authentication) {
		CustomUserDetails user = (CustomUserDetails) authentication.getPrincipal();
		return BaseRes.ok(twoFactorService.updateConfig(roleId, request, user.getId()));
	}
}
