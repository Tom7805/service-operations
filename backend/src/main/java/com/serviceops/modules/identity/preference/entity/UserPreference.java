package com.serviceops.modules.identity.preference.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.identity.preference.enums.DisplayDensity;
import com.serviceops.modules.identity.preference.enums.ThemeMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Tuy chon giao dien cua mot nguoi dung (Cai dat - Giao dien): chu de, mat do hien thi, man hinh mo dau
 * sau dang nhap, thanh ben thu gon, giam hieu ung. Luu o may chu de di theo tai khoan sang may khac.
 * Khong co ban ghi nghia la dung mac dinh — xem {@code UserPreferenceServiceImpl#defaults}.
 */
@Getter
@Setter
@Entity
@Table(name = "user_preferences")
public class UserPreference extends BaseEntity {

	@Column(name = "user_id", nullable = false, unique = true)
	private Long userId;

	@Enumerated(EnumType.STRING)
	@Column(name = "theme", nullable = false, columnDefinition = "VARCHAR(10)")
	private ThemeMode theme = ThemeMode.LIGHT;

	@Enumerated(EnumType.STRING)
	@Column(name = "density", nullable = false, columnDefinition = "VARCHAR(12)")
	private DisplayDensity density = DisplayDensity.COMFORTABLE;

	/** Ma man hinh mo dau (vd PROJECTS); null = mac dinh theo vai tro. Frontend tu kiem tra quyen xem. */
	@Column(name = "landing_tab", length = 40)
	private String landingTab;

	@Column(name = "sidebar_collapsed", nullable = false)
	private Boolean sidebarCollapsed = false;

	@Column(name = "reduce_motion", nullable = false)
	private Boolean reduceMotion = false;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
