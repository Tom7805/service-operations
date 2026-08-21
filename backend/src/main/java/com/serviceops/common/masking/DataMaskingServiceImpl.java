package com.serviceops.common.masking;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Set;

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
		return canViewSensitiveData() ? value : MaskingJsonSerializer.MASKED_VALUE;
	}

	static boolean hasSensitiveDataRole(Authentication authentication) {
		return authentication != null && authentication.isAuthenticated()
				&& authentication.getAuthorities().stream()
				.map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
				.anyMatch(SENSITIVE_DATA_ROLES::contains);
	}
}
