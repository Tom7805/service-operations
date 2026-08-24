package com.serviceops.modules.identity.user.service.impl;

import com.serviceops.modules.identity.user.dto.response.RoleRes;
import com.serviceops.modules.identity.user.mapper.RoleMapper;
import com.serviceops.modules.identity.user.repository.RoleRepository;
import com.serviceops.modules.identity.user.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;

    @Override
    public List<RoleRes> findAll() {
        return roleRepository.findAll().stream()
                .sorted(Comparator.comparing(role -> role.getCode()))
                .map(roleMapper::toResponse)
                .toList();
    }
}
