package com.serviceops.modules.identity.user.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.user.dto.response.RoleRes;
import com.serviceops.modules.identity.user.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class RoleController {
    private final RoleService roleService;

    @GetMapping
    public BaseRes<List<RoleRes>> findAll() {
        return BaseRes.ok(roleService.findAll());
    }
}
