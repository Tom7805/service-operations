package com.serviceops.common.masking;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Set;

@Slf4j
@Service
public class DataMaskingServiceImpl implements DataMaskingService {
	static final Set<String> SENSITIVE_DATA_ROLES = Set.of("VT-01", "VT-05", "VT-06");

	@Override
	public boolean canViewSensitiveData() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return hasSensitiveDataRole(authentication);
	}

	@Override
	public Object mask(Object value) {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		boolean allowed = hasSensitiveDataRole(authentication);
		String username = authentication != null ? authentication.getName() : "anonymous";
		log.info("SENSITIVE_DATA_ACCESS username={} masked={}", username, !allowed);
		return allowed ? value : MaskingJsonSerializer.MASKED_VALUE;
	}

	static boolean hasSensitiveDataRole(Authentication authentication) {
		return authentication != null && authentication.isAuthenticated()
				&& authentication.getAuthorities().stream()
				.map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
				.anyMatch(SENSITIVE_DATA_ROLES::contains);
	}
}
