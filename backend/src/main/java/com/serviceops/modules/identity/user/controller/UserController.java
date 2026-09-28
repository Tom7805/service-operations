package com.serviceops.modules.identity.user.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.user.dto.request.CreateUserReq;
import com.serviceops.modules.identity.user.dto.request.UpdateUserReq;
import com.serviceops.modules.identity.user.dto.request.UserStatusReq;
import com.serviceops.modules.identity.user.dto.response.AssignableProjectManagerRes;
import com.serviceops.modules.identity.user.dto.response.UserLookupRes;
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

    /**
     * Danh sach rut gon nguoi dung dang hoat dong, dung cho combobox chon nguoi (vi du
     * "Nguoi quan ly du an" khi tao du an tu hop dong) — khong doi hoi vai tro Quan tri
     * vien nhu GET /users vi khong tra du lieu nhay cam (chi id + ten).
     */
    @GetMapping("/lookup")
    @PreAuthorize("hasAnyRole('VT-02', 'VT-07')")
    public BaseRes<List<UserLookupRes>> lookupActive() {
        return BaseRes.ok(userService.lookupActive());
    }

    @GetMapping
    public BaseRes<List<UserRes>> findAll(@RequestParam(required = false) String keyword) {
        return BaseRes.ok(userService.findAll(keyword));
    }

    /**
     * Danh sach tai khoan dang ACTIVE — dung cho combobox "Nguoi quan ly du an"
     * (NCL-05-CN-001/007). Quan ly du an (VT-02) can du lieu nay nhung khong duoc
     * phep goi /users day du (chi VT-07), nen ghi de phan quyen o muc method nay.
     */
    @GetMapping("/assignable-for-project")
    @PreAuthorize("hasRole('VT-02') or hasRole('VT-07')")
    public BaseRes<List<AssignableProjectManagerRes>> findAssignableProjectManagers() {
        return BaseRes.ok(userService.findAssignableProjectManagers());
    }

    @GetMapping("/{id}")
    public BaseRes<UserRes> findById(@PathVariable Long id) {
        return BaseRes.ok(userService.findById(id));
    }

    @PostMapping
    public BaseRes<UserRes> create(@Valid @RequestBody CreateUserReq request) {
        return BaseRes.ok("Tạo tài khoản thành công", userService.create(request));
    }

    @PutMapping("/{id}")
    public BaseRes<UserRes> update(@PathVariable Long id, @Valid @RequestBody UpdateUserReq request) {
        return BaseRes.ok("Cập nhật tài khoản thành công", userService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public BaseRes<UserRes> updateStatus(@PathVariable Long id, @Valid @RequestBody UserStatusReq request) {
        return BaseRes.ok("Cập nhật trạng thái thành công", userService.updateStatus(id, request));
    }
}
