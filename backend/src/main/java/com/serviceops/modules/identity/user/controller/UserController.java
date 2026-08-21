package com.serviceops.modules.identity.user.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.user.dto.request.CreateUserReq;
import com.serviceops.modules.identity.user.dto.request.UpdateUserReq;
import com.serviceops.modules.identity.user.dto.request.UserStatusReq;
import com.serviceops.modules.identity.user.dto.response.UserRes;
import com.serviceops.modules.identity.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class UserController {
    private final UserService userService;

    @GetMapping
    public BaseRes<List<UserRes>> findAll(@RequestParam(required = false) String keyword) {
        return BaseRes.ok(userService.findAll(keyword));
    }

    @GetMapping("/{id}")
    public BaseRes<UserRes> findById(@PathVariable Long id) {
        return BaseRes.ok(userService.findById(id));
    }

    @PostMapping
    public BaseRes<UserRes> create(@Valid @RequestBody CreateUserReq request) {
        return BaseRes.ok("Tao tai khoan thanh cong", userService.create(request));
    }

    @PutMapping("/{id}")
    public BaseRes<UserRes> update(@PathVariable Long id, @Valid @RequestBody UpdateUserReq request) {
        return BaseRes.ok("Cap nhat tai khoan thanh cong", userService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public BaseRes<UserRes> updateStatus(@PathVariable Long id, @Valid @RequestBody UserStatusReq request) {
        return BaseRes.ok("Cap nhat trang thai thanh cong", userService.updateStatus(id, request));
    }
}
