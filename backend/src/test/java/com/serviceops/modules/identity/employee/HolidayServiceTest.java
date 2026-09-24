package com.serviceops.modules.identity.employee;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.dto.request.HolidayReq;
import com.serviceops.modules.identity.employee.dto.response.HolidayRes;
import com.serviceops.modules.identity.employee.entity.Holiday;
import com.serviceops.modules.identity.employee.repository.HolidayRepository;
import com.serviceops.modules.identity.employee.service.HolidayCalendar;
import com.serviceops.modules.identity.employee.service.impl.HolidayServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HolidayServiceTest {

	private static final LocalDate DATE = LocalDate.of(2026, 9, 2);

	@Mock private HolidayRepository holidayRepository;
	@Mock private AuditLogService auditLogService;

	private HolidayServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new HolidayServiceImpl(holidayRepository, auditLogService);
	}

	@Test
	void createsHolidayAndRecordsAudit() {
		when(holidayRepository.existsByHolidayDate(DATE)).thenReturn(false);
		when(holidayRepository.save(any(Holiday.class))).thenAnswer(invocation -> {
			Holiday saved = invocation.getArgument(0);
			saved.setId(7L);
			return saved;
		});

		HolidayRes result = service.create(new HolidayReq("  Quoc khanh  ", DATE, true));

		assertThat(result).isEqualTo(new HolidayRes(7L, "Quoc khanh", DATE, true));
		verify(auditLogService).record(eq("Thêm ngày lễ"), eq(AuditTargetType.GENERAL), eq(7L), eq("Quoc khanh"),
				contains("2026-09-02"));
	}

	@Test
	void rejectsDuplicateDateOnCreate() {
		when(holidayRepository.existsByHolidayDate(DATE)).thenReturn(true);

		assertThatThrownBy(() -> service.create(new HolidayReq("Quoc khanh", DATE, false)))
				.isInstanceOf(BusinessRuleException.class)
				.hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_DATA);

		verify(holidayRepository, never()).save(any());
		verify(auditLogService, never()).record(any(), any(), any(), any(), any());
	}

	@Test
	void updatesHolidayAndRecordsBeforeAndAfter() {
		Holiday existing = holiday(7L, "Nghi bu", LocalDate.of(2026, 9, 1), false);
		when(holidayRepository.findById(7L)).thenReturn(Optional.of(existing));
		when(holidayRepository.existsByHolidayDateAndIdNot(DATE, 7L)).thenReturn(false);
		when(holidayRepository.save(existing)).thenReturn(existing);

		HolidayRes result = service.update(7L, new HolidayReq("Quoc khanh", DATE, true));

		assertThat(result).isEqualTo(new HolidayRes(7L, "Quoc khanh", DATE, true));
		verify(auditLogService).record(eq("Cập nhật ngày lễ"), eq(AuditTargetType.GENERAL), eq(7L), eq("Quoc khanh"),
				contains("2026-09-01"));
	}

	/** Đổi sang đúng ngày của một ngày lễ khác thì trùng; giữ nguyên ngày của chính nó thì không. */
	@Test
	void rejectsDateOfAnotherHolidayOnUpdate() {
		when(holidayRepository.findById(7L)).thenReturn(Optional.of(holiday(7L, "Nghi bu", DATE, false)));
		when(holidayRepository.existsByHolidayDateAndIdNot(DATE, 7L)).thenReturn(true);

		assertThatThrownBy(() -> service.update(7L, new HolidayReq("Nghi bu", DATE, false)))
				.hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_DATA);

		verify(holidayRepository, never()).save(any());
	}

	@Test
	void updateAndDeleteReportNotFound() {
		when(holidayRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.update(99L, new HolidayReq("Nghi bu", DATE, false)))
				.hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
		assertThatThrownBy(() -> service.delete(99L))
				.hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	void deletesHolidayAndRecordsAudit() {
		Holiday existing = holiday(7L, "Quoc khanh", DATE, true);
		when(holidayRepository.findById(7L)).thenReturn(Optional.of(existing));

		service.delete(7L);

		verify(holidayRepository).delete(existing);
		verify(auditLogService).record(eq("Xóa ngày lễ"), eq(AuditTargetType.GENERAL), eq(7L), eq("Quoc khanh"),
				contains("lặp hằng năm"));
	}

	@Test
	void findAllReturnsHolidaysInDateOrder() {
		when(holidayRepository.findAllByOrderByHolidayDateAsc()).thenReturn(List.of(
				holiday(1L, "Tet duong lich", LocalDate.of(2026, 1, 1), true), holiday(2L, "Quoc khanh", DATE, true)));

		assertThat(service.findAll()).extracting(HolidayRes::name).containsExactly("Tet duong lich", "Quoc khanh");
	}

	@Test
	void calendarForExpandsRecurringHolidays() {
		LocalDate from = LocalDate.of(2026, 1, 1);
		LocalDate to = LocalDate.of(2026, 12, 31);
		when(holidayRepository.findApplicableBetween(from, to))
				.thenReturn(List.of(holiday(2L, "Quoc khanh", LocalDate.of(2025, 9, 2), true)));

		HolidayCalendar calendar = service.calendarFor(from, to);

		assertThat(calendar.isHoliday(DATE)).isTrue();
	}

	private static Holiday holiday(Long id, String name, LocalDate date, boolean recurringYearly) {
		Holiday holiday = new Holiday();
		holiday.setId(id);
		holiday.setName(name);
		holiday.setHolidayDate(date);
		holiday.setRecurringYearly(recurringYearly);
		return holiday;
	}
}
