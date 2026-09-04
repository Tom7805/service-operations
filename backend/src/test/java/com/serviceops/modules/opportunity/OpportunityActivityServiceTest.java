package com.serviceops.modules.opportunity;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.opportunity.dto.request.ActivityCreateReq;
import com.serviceops.modules.opportunity.dto.response.ActivityRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.entity.OpportunityActivity;
import com.serviceops.modules.opportunity.entity.OpportunityAuditLog;
import com.serviceops.modules.opportunity.enums.ActivityType;
import com.serviceops.modules.opportunity.enums.OpportunityAuditAction;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.mapper.OpportunityActivityMapper;
import com.serviceops.modules.opportunity.repository.OpportunityActivityRepository;
import com.serviceops.modules.opportunity.repository.OpportunityAuditLogRepository;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.impl.OpportunityActivityServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test {@link OpportunityActivityServiceImpl} — NCL-03-CN-006 (ghi nhan
 * hoat dong cham soc co hoi): TC-01 them hoat dong thanh cong, TC-02 co hoi
 * da dong thi chi con xem lai lich su, TC-04 ghi nhat ky.
 */
@ExtendWith(MockitoExtension.class)
class OpportunityActivityServiceTest {

	@Mock
	private OpportunityRepository opportunityRepository;

	@Mock
	private OpportunityActivityRepository opportunityActivityRepository;

	@Mock
	private OpportunityAuditLogRepository auditLogRepository;

	private final OpportunityActivityMapper opportunityActivityMapper = new OpportunityActivityMapper();

	private OpportunityActivityServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new OpportunityActivityServiceImpl(opportunityRepository, opportunityActivityRepository,
				opportunityActivityMapper, auditLogRepository);

		lenient().when(opportunityActivityRepository.save(any(OpportunityActivity.class))).thenAnswer(inv -> {
			OpportunityActivity activity = inv.getArgument(0);
			if (activity.getId() == null) {
				activity.setId(1L);
			}
			return activity;
		});
	}

	private Opportunity openOpportunity() {
		Opportunity opportunity = new Opportunity();
		opportunity.setId(10L);
		opportunity.setCustomerId(1001L);
		opportunity.setName("Trien khai CRM");
		opportunity.setStatus(OpportunityStatus.OPEN);
		return opportunity;
	}

	@Test
	@DisplayName("NCL-03-CN-006 TC-01: co hoi con mo thi them hoat dong cham soc thanh cong")
	void addsActivityWhenOpportunityIsOpen() {
		when(opportunityRepository.findById(10L)).thenReturn(Optional.of(openOpportunity()));
		LocalDateTime occurredAt = LocalDateTime.of(2026, 1, 6, 14, 0);

		ActivityCreateReq req = new ActivityCreateReq(ActivityType.CALL, occurredAt,
				"sale01, chi Lan (khach hang)", "Goi gioi thieu giai phap, khach hang quan tam bao gia.");

		ActivityRes result = service.addActivity(10L, req);

		assertThat(result.opportunityId()).isEqualTo(10L);
		assertThat(result.activityType()).isEqualTo(ActivityType.CALL);
		assertThat(result.occurredAt()).isEqualTo(occurredAt);
		assertThat(result.content()).isEqualTo("Goi gioi thieu giai phap, khach hang quan tam bao gia.");
		assertThat(result.participants()).isEqualTo("sale01, chi Lan (khach hang)");
	}

	@Test
	@DisplayName("NCL-03-CN-006 TC-01: khong nhap nguoi tham gia thi luu la null (truong khong bat buoc)")
	void storesBlankParticipantsAsNull() {
		when(opportunityRepository.findById(10L)).thenReturn(Optional.of(openOpportunity()));

		ArgumentCaptor<OpportunityActivity> captor = ArgumentCaptor.forClass(OpportunityActivity.class);
		service.addActivity(10L,
				new ActivityCreateReq(ActivityType.NOTE, LocalDateTime.now(), "   ", "Ghi chu noi bo"));

		verify(opportunityActivityRepository).save(captor.capture());
		assertThat(captor.getValue().getParticipants()).isNull();
	}

	@ParameterizedTest(name = "NCL-03-CN-006 TC-02: co hoi o trang thai {0} thi tu choi them hoat dong moi")
	@EnumSource(value = OpportunityStatus.class, names = {"WON", "LOST"})
	void rejectsAddingActivityWhenOpportunityIsClosed(OpportunityStatus closedStatus) {
		Opportunity closed = openOpportunity();
		closed.setStatus(closedStatus);
		when(opportunityRepository.findById(10L)).thenReturn(Optional.of(closed));

		ActivityCreateReq req = new ActivityCreateReq(ActivityType.CALL, LocalDateTime.now(), null, "Noi dung");

		assertThatThrownBy(() -> service.addActivity(10L, req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);

		verify(opportunityActivityRepository, never()).save(any());
		verify(auditLogRepository, never()).save(any());
	}

	@Test
	@DisplayName("NCL-03-CN-006 TC-02: co hoi da dong van xem duoc dong thoi gian cham soc (chi bi chan them moi)")
	void allowsListingActivitiesEvenWhenOpportunityIsClosed() {
		when(opportunityRepository.existsById(10L)).thenReturn(true);
		OpportunityActivity activity = new OpportunityActivity();
		activity.setId(1L);
		activity.setOpportunityId(10L);
		activity.setActivityType(ActivityType.CALL);
		activity.setOccurredAt(LocalDateTime.now());
		activity.setContent("Da trao doi truoc khi dong co hoi");
		when(opportunityActivityRepository.findByOpportunityIdOrderByOccurredAtDescIdDesc(10L))
				.thenReturn(List.of(activity));

		List<ActivityRes> result = service.listByOpportunity(10L);

		assertThat(result).hasSize(1);
		assertThat(result.get(0).content()).isEqualTo("Da trao doi truoc khi dong co hoi");
	}

	@Test
	@DisplayName("Khong tim thay co hoi thi bao loi va khong luu hoat dong")
	void rejectsWhenOpportunityNotFound() {
		when(opportunityRepository.findById(99L)).thenReturn(Optional.empty());
		ActivityCreateReq req = new ActivityCreateReq(ActivityType.CALL, LocalDateTime.now(), null, "Noi dung");

		assertThatThrownBy(() -> service.addActivity(99L, req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);

		verify(opportunityActivityRepository, never()).save(any());
	}

	@Test
	@DisplayName("Khong tim thay co hoi thi bao loi khi xem dong thoi gian")
	void rejectsListingWhenOpportunityNotFound() {
		when(opportunityRepository.existsById(99L)).thenReturn(false);

		assertThatThrownBy(() -> service.listByOpportunity(99L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("Noi dung chi toan khoang trang thi bao loi va khong luu")
	void rejectsBlankContent() {
		when(opportunityRepository.findById(10L)).thenReturn(Optional.of(openOpportunity()));
		ActivityCreateReq req = new ActivityCreateReq(ActivityType.NOTE, LocalDateTime.now(), null, "    ");

		assertThatThrownBy(() -> service.addActivity(10L, req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(opportunityActivityRepository, never()).save(any());
	}

	@Test
	@DisplayName("NCL-03-CN-006 TC-04: them hoat dong thanh cong thi ghi nhat ky ACTIVITY_ADD")
	void recordsAuditLogOnAddActivity() {
		when(opportunityRepository.findById(10L)).thenReturn(Optional.of(openOpportunity()));

		service.addActivity(10L,
				new ActivityCreateReq(ActivityType.MEETING, LocalDateTime.now(), null, "Hop demo truc tiep"));

		ArgumentCaptor<OpportunityAuditLog> captor = ArgumentCaptor.forClass(OpportunityAuditLog.class);
		verify(auditLogRepository).save(captor.capture());
		assertThat(captor.getValue().getActionType()).isEqualTo(OpportunityAuditAction.ACTIVITY_ADD);
		assertThat(captor.getValue().getOpportunityId()).isEqualTo(10L);
	}

	@Test
	@DisplayName("Dong thoi gian cham soc: hoat dong dien ra gan nhat hien len dau")
	void listOrdersMostRecentActivityFirst() {
		when(opportunityRepository.existsById(10L)).thenReturn(true);

		OpportunityActivity older = new OpportunityActivity();
		older.setId(1L);
		older.setOpportunityId(10L);
		older.setActivityType(ActivityType.CALL);
		older.setOccurredAt(LocalDateTime.of(2026, 1, 6, 14, 0));
		older.setContent("Cuoc goi dau tien");

		OpportunityActivity newer = new OpportunityActivity();
		newer.setId(2L);
		newer.setOpportunityId(10L);
		newer.setActivityType(ActivityType.MEETING);
		newer.setOccurredAt(LocalDateTime.of(2026, 1, 12, 9, 30));
		newer.setContent("Hop demo gan day nhat");

		// Repository method da co ten khang dinh thu tu DESC — moc lai dung thu tu do de test khong lo cach sap xep that.
		when(opportunityActivityRepository.findByOpportunityIdOrderByOccurredAtDescIdDesc(10L))
				.thenReturn(List.of(newer, older));

		List<ActivityRes> result = service.listByOpportunity(10L);

		assertThat(result).hasSize(2);
		assertThat(result.get(0).content()).isEqualTo("Hop demo gan day nhat");
		assertThat(result.get(1).content()).isEqualTo("Cuoc goi dau tien");
	}

	@Test
	@DisplayName("Tao hoat dong xong thi tra ve du 8 truong da luu (id, co hoi, loai, thoi diem, nguoi tham gia, noi dung, nguoi tao, thoi diem tao)")
	void mapsAllFieldsInResponse() {
		when(opportunityRepository.findById(10L)).thenReturn(Optional.of(openOpportunity()));

		ActivityRes result = service.addActivity(10L,
				new ActivityCreateReq(ActivityType.EMAIL, LocalDateTime.of(2026, 1, 11, 8, 15),
						"sale.lead", "Gui thu gioi thieu dich vu"));

		assertThat(result.id()).isNotNull();
		assertThat(result.opportunityId()).isEqualTo(10L);
		assertThat(result.activityType()).isEqualTo(ActivityType.EMAIL);
		assertThat(result.occurredAt()).isEqualTo(LocalDateTime.of(2026, 1, 11, 8, 15));
		assertThat(result.participants()).isEqualTo("sale.lead");
		assertThat(result.content()).isEqualTo("Gui thu gioi thieu dich vu");
		assertThat(result.createdAt()).isNotNull();
	}

	@Test
	@DisplayName("Danh sach hoat dong rong khi co hoi chua co hoat dong nao")
	void listReturnsEmptyWhenNoActivitiesYet() {
		when(opportunityRepository.existsById(anyLong())).thenReturn(true);
		when(opportunityActivityRepository.findByOpportunityIdOrderByOccurredAtDescIdDesc(anyLong()))
				.thenReturn(List.of());

		List<ActivityRes> result = service.listByOpportunity(10L);

		assertThat(result).isEmpty();
	}
}
