package com.serviceops.modules.identity.user.service;

import com.serviceops.modules.identity.user.dto.response.RoleRes;

import java.util.List;

public interface RoleService {
    List<RoleRes> findAll();
}
