package com.serviceops.modules.identity.user.repository;

import com.serviceops.modules.identity.user.entity.UserRoleScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserRoleScopeRepository extends JpaRepository<UserRoleScope, Long> {

    void deleteByUserId(Long userId);

    @Query("select urs.role.code from UserRoleScope urs where urs.user.id = :userId")
    List<String> findRoleCodesByUserId(@Param("userId") Long userId);

    List<UserRoleScope> findByUser_Id(Long userId);

    /** NCL-09-CN-004: tim tat ca user dang giu mot vai tro (vd VT-01) de gui canh bao am bien. */
    @Query("select distinct urs.user.id from UserRoleScope urs where urs.role.code = :roleCode")
    List<Long> findUserIdsByRoleCode(@Param("roleCode") String roleCode);
}
