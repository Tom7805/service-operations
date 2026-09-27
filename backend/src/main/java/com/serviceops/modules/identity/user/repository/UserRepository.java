package com.serviceops.modules.identity.user.repository;

import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    List<User> findByStatusOrderByFullNameAsc(UserStatus status);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    /** NCL-13-CN-001: email dung de khoi phuc mat khau phai duy nhat (findByEmailIgnoreCase tra Optional). */
    boolean existsByEmailIgnoreCase(String email);

    long countByDepartmentId(Long departmentId);

    List<User> findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(String username, String fullName);
}
