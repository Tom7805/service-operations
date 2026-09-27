package com.serviceops.modules.identity.preference;

import com.serviceops.modules.identity.preference.dto.request.UserPreferenceReq;
import com.serviceops.modules.identity.preference.dto.response.UserPreferenceRes;
import com.serviceops.modules.identity.preference.entity.UserPreference;
import com.serviceops.modules.identity.preference.enums.DisplayDensity;
import com.serviceops.modules.identity.preference.enums.ThemeMode;
import com.serviceops.modules.identity.preference.repository.UserPreferenceRepository;
import com.serviceops.modules.identity.preference.service.impl.UserPreferenceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserPreferenceServiceTest {

	@Mock
	private UserPreferenceRepository userPreferenceRepository;

	private UserPreferenceServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new UserPreferenceServiceImpl(userPreferenceRepository);
	}

	@Test
	@DisplayName("Chua luu lan nao: tra mac dinh (sang, thoai mai, mo dau theo vai tro, thanh ben mo rong)")
	void returnsDefaultsWhenNothingSaved() {
		when(userPreferenceRepository.findByUserId(7L)).thenReturn(Optional.empty());

		UserPreferenceRes res = service.get(7L);

		assertThat(res.theme()).isEqualTo(ThemeMode.LIGHT);
		assertThat(res.density()).isEqualTo(DisplayDensity.COMFORTABLE);
		assertThat(res.landingTab()).isNull();
		assertThat(res.sidebarCollapsed()).isFalse();
		assertThat(res.reduceMotion()).isFalse();
	}

	@Test
	@DisplayName("Luu lan dau: tao ban ghi moi gan dung nguoi dung")
	void createsPreferenceOnFirstSave() {
		when(userPreferenceRepository.findByUserId(7L)).thenReturn(Optional.empty());
		when(userPreferenceRepository.save(any(UserPreference.class))).thenAnswer((inv) -> inv.getArgument(0));

		UserPreferenceRes res = service.update(7L,
				new UserPreferenceReq(ThemeMode.DARK, DisplayDensity.COMPACT, "PROJECTS", true, true));

		ArgumentCaptor<UserPreference> saved = ArgumentCaptor.forClass(UserPreference.class);
		verify(userPreferenceRepository).save(saved.capture());
		assertThat(saved.getValue().getUserId()).isEqualTo(7L);
		assertThat(saved.getValue().getUpdatedAt()).isNotNull();
		assertThat(res.theme()).isEqualTo(ThemeMode.DARK);
		assertThat(res.density()).isEqualTo(DisplayDensity.COMPACT);
		assertThat(res.landingTab()).isEqualTo("PROJECTS");
		assertThat(res.sidebarCollapsed()).isTrue();
		assertThat(res.reduceMotion()).isTrue();
	}

	@Test
	@DisplayName("Luu lai: ghi de ban ghi cu; man hinh mo dau rong quay ve mac dinh (null)")
	void overwritesExistingPreference() {
		UserPreference existing = new UserPreference();
		existing.setUserId(7L);
		existing.setTheme(ThemeMode.DARK);
		existing.setLandingTab("PROJECTS");
		when(userPreferenceRepository.findByUserId(7L)).thenReturn(Optional.of(existing));
		when(userPreferenceRepository.save(any(UserPreference.class))).thenAnswer((inv) -> inv.getArgument(0));

		UserPreferenceRes res = service.update(7L,
				new UserPreferenceReq(ThemeMode.SYSTEM, DisplayDensity.COMFORTABLE, "", false, false));

		assertThat(res.theme()).isEqualTo(ThemeMode.SYSTEM);
		assertThat(res.landingTab()).isNull();
		assertThat(existing.getTheme()).isEqualTo(ThemeMode.SYSTEM);
	}
}
