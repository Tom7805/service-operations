package com.serviceops.modules.identity.preference.dto.response;

import com.serviceops.modules.identity.preference.enums.DisplayDensity;
import com.serviceops.modules.identity.preference.enums.ThemeMode;

public record UserPreferenceRes(
		ThemeMode theme,
		DisplayDensity density,
		String landingTab,
		boolean sidebarCollapsed,
		boolean reduceMotion
) {}
