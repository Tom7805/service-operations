package com.serviceops.modules.identity.employee.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.dto.request.HolidayReq;
import com.serviceops.modules.identity.employee.dto.response.HolidayRes;
import com.serviceops.modules.identity.employee.entity.Holiday;
import com.serviceops.modules.identity.employee.repository.HolidayRepository;
import com.serviceops.modules.identity.employee.service.HolidayCalendar;
import com.serviceops.modules.identity.employee.service.HolidayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class HolidayServiceImpl implements HolidayService {

    private final HolidayRepository holidayRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<HolidayRes> findAll() {
        return holidayRepository.findAllByOrderByHolidayDateAsc().stream().map(this::toResponse).toList();
    }

    @Override
    public HolidayRes create(HolidayReq request) {
        if (holidayRepository.existsByHolidayDate(request.holidayDate())) {
            throw duplicate();
        }
        Holiday holiday = new Holiday();
        apply(holiday, request);
        holiday = holidayRepository.save(holiday);

        auditLogService.record("Thêm ngày lễ", AuditTargetType.GENERAL, holiday.getId(), holiday.getName(),
                "Thêm ngày lễ " + describe(holiday));
        return toResponse(holiday);
    }

    @Override
    public HolidayRes update(Long id, HolidayReq request) {
        Holiday holiday = getHoliday(id);
        if (holidayRepository.existsByHolidayDateAndIdNot(request.holidayDate(), id)) {
            throw duplicate();
        }
        String before = describe(holiday);
        apply(holiday, request);
        holiday = holidayRepository.save(holiday);

        auditLogService.record("Cập nhật ngày lễ", AuditTargetType.GENERAL, holiday.getId(), holiday.getName(),
                "Đổi ngày lễ " + before + " thành " + describe(holiday));
        return toResponse(holiday);
    }

    @Override
    public void delete(Long id) {
        Holiday holiday = getHoliday(id);
        holidayRepository.delete(holiday);

        auditLogService.record("Xóa ngày lễ", AuditTargetType.GENERAL, holiday.getId(), holiday.getName(),
                "Xóa ngày lễ " + describe(holiday));
    }

    @Override
    @Transactional(readOnly = true)
    public HolidayCalendar calendarFor(LocalDate from, LocalDate to) {
        return HolidayCalendar.of(holidayRepository.findApplicableBetween(from, to), from, to);
    }

    private Holiday getHoliday(Long id) {
        return holidayRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Khong tim thay ngay le voi ID: " + id));
    }

    private static BusinessRuleException duplicate() {
        return new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Ngay nay da duoc khai bao la ngay le");
    }

    private static void apply(Holiday holiday, HolidayReq request) {
        holiday.setName(request.name().trim());
        holiday.setHolidayDate(request.holidayDate());
        holiday.setRecurringYearly(request.recurringYearly());
    }

    private static String describe(Holiday holiday) {
        return "\"" + holiday.getName() + "\" (" + holiday.getHolidayDate()
                + (holiday.isRecurringYearly() ? ", lặp hằng năm" : "") + ")";
    }

    private HolidayRes toResponse(Holiday holiday) {
        return new HolidayRes(holiday.getId(), holiday.getName(), holiday.getHolidayDate(),
                holiday.isRecurringYearly());
    }
}
