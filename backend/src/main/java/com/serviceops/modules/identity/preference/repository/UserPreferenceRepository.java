package com.serviceops.modules.identity.preference.repository;

import com.serviceops.modules.identity.preference.entity.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {

	Optional<UserPreference> findByUserId(Long userId);
}
