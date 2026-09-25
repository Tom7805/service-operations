package com.serviceops.modules.admin.repository;

import com.serviceops.modules.admin.entity.CompanySetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanySettingRepository extends JpaRepository<CompanySetting, Long> {
}
