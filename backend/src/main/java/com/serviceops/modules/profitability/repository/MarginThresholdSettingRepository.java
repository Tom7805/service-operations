package com.serviceops.modules.profitability.repository;

import com.serviceops.modules.profitability.entity.MarginThresholdSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MarginThresholdSettingRepository extends JpaRepository<MarginThresholdSetting, Long> {

	/** Chi co 1 dong cau hinh hien hanh - lay dong moi nhat (xem MarginAlertServiceImpl#setThreshold). */
	Optional<MarginThresholdSetting> findTopByOrderByIdDesc();
}
