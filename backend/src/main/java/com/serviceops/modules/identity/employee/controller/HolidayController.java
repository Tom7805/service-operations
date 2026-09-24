package com.serviceops.modules.identity.employee.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.employee.dto.request.HolidayReq;
import com.serviceops.modules.identity.employee.dto.response.HolidayRes;
import com.serviceops.modules.identity.employee.service.HolidayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Lich ngay nghi le: ngay le khong tinh vao gio lam viec chuan (QTN-23) cua bao cao ty le gio tinh phi.
 * Cung phan quyen voi ho so nhan su: chi Nhan su (VT-06) va Quan tri vien (VT-07).
 */
@RestController
@RequestMapping("/holidays")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-06') or hasRole('VT-07')")
public class HolidayController {

    private final HolidayService holidayService;

    @GetMapping
    public BaseRes<List<HolidayRes>> findAll() {
        return BaseRes.ok(holidayService.findAll());
    }

    @PostMapping
    public BaseRes<HolidayRes> create(@Valid @RequestBody HolidayReq request) {
        return BaseRes.ok("Them ngay le thanh cong", holidayService.create(request));
    }

    @PutMapping("/{id}")
    public BaseRes<HolidayRes> update(@PathVariable Long id, @Valid @RequestBody HolidayReq request) {
        return BaseRes.ok("Cap nhat ngay le thanh cong", holidayService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public BaseRes<Void> delete(@PathVariable Long id) {
        holidayService.delete(id);
        return BaseRes.ok("Xoa ngay le thanh cong", null);
    }
}
