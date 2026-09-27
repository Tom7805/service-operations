package com.serviceops.modules.identity.preference.service.impl;

import com.serviceops.modules.identity.preference.dto.request.UserPreferenceReq;
import com.serviceops.modules.identity.preference.dto.response.UserPreferenceRes;
import com.serviceops.modules.identity.preference.entity.UserPreference;
import com.serviceops.modules.identity.preference.enums.DisplayDensity;
import com.serviceops.modules.identity.preference.enums.ThemeMode;
import com.serviceops.modules.identity.preference.repository.UserPreferenceRepository;
import com.serviceops.modules.identity.preference.service.UserPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserPreferenceServiceImpl implements UserPreferenceService {

	private final UserPreferenceRepository userPreferenceRepository;

	/** Mac dinh: giao dien sang, mat do thoai mai, man hinh mo dau theo vai tro, thanh ben mo rong. */
	static UserPreferenceRes defaults() {
		return new UserPreferenceRes(ThemeMode.LIGHT, DisplayDensity.COMFORTABLE, null, false, false);
	}

	@Override
	@Transactional(readOnly = true)
	public UserPreferenceRes get(Long userId) {
		return userPreferenceRepository.findByUserId(userId)
				.map(UserPreferenceServiceImpl::toRes)
				.orElseGet(UserPreferenceServiceImpl::defaults);
	}

	@Override
	@Transactional
	public UserPreferenceRes update(Long userId, UserPreferenceReq request) {
		UserPreference preference = userPreferenceRepository.findByUserId(userId).orElseGet(() -> {
			UserPreference created = new UserPreference();
			created.setUserId(userId);
			return created;
		});
		preference.setTheme(request.theme());
		preference.setDensity(request.density());
		// Chuoi rong = bo chon man hinh mo dau (quay ve mac dinh theo vai tro).
		String landing = request.landingTab();
		preference.setLandingTab(landing == null || landing.isBlank() ? null : landing);
		preference.setSidebarCollapsed(request.sidebarCollapsed());
		preference.setReduceMotion(request.reduceMotion());
		preference.setUpdatedAt(LocalDateTime.now());
		return toRes(userPreferenceRepository.save(preference));
	}

	private static UserPreferenceRes toRes(UserPreference p) {
		return new UserPreferenceRes(p.getTheme(), p.getDensity(), p.getLandingTab(),
				Boolean.TRUE.equals(p.getSidebarCollapsed()), Boolean.TRUE.equals(p.getReduceMotion()));
	}
}
