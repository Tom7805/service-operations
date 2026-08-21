package com.serviceops.modules.identity.user.mapper;

import com.serviceops.modules.identity.user.dto.response.RoleRes;
import com.serviceops.modules.identity.user.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class RoleMapper {
    public RoleRes toResponse(Role role) {
        return new RoleRes(role.getId(), role.getCode(), role.getName(), role.getDescription());
    }
}
