package com.serviceops.modules.identity.user.repository;

import com.serviceops.modules.identity.user.entity.UserRoleScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserRoleScopeRepository extends JpaRepository<UserRoleScope, Long> {

    @Query("select urs.role.code from UserRoleScope urs where urs.user.id = :userId")
    List<String> findRoleCodesByUserId(@Param("userId") Long userId);
}
