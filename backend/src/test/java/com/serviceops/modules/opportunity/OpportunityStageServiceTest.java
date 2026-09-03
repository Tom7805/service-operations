package com.serviceops.modules.opportunity;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.opportunity.dto.request.StageChangeReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.dto.response.StageHistoryRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.entity.OpportunityStageHistory;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.mapper.OpportunityMapper;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.repository.OpportunityStageHistoryRepository;
import com.serviceops.modules.opportunity.service.impl.OpportunityStageServiceImpl;
import com.serviceops.modules.opportunity.validator.StageTransitionValidator;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test OpportunityStageServiceImpl - NCL-03-CN-002 (TC-01: cap nhat xac suat,
 * TC-02: chuyen dung thu tu / tu choi nhay coc, TC-03: khong mo lai co hoi da dong,
 * TC-05: ghi lich su chuyen giai doan).
 */
@ExtendWith(MockitoExtension.class)
class OpportunityStageServiceTest {

	@Mock
	private OpportunityRepository opportunityRepository;

	@Mock
	private OpportunityStageHistoryRepository stageHistoryRepository;

	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;

	private final StageTransitionValidator stageTransitionValidator = new StageTransitionValidator();

	private final OpportunityMapper opportunityMapper = new OpportunityMapper();

	private OpportunityStageServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new OpportunityStageServiceImpl(opportunityRepository, stageHistoryRepository,
				stageTransitionValidator, opportunityMapper, currentUserScopeProvider);

		lenient().when(opportunityRepository.save(any(Opportunity.class))).thenAnswer(inv -> inv.getArgument(0));
	}

	private Opportunity openOpportunity(long id, OpportunityStage stage) {
		Opportunity opportunity = new Opportunity();
		opportunity.setId(id);
		opportunity.setName("Trien khai ERP");
		opportunity.setStage(stage);
		opportunity.setStatus(OpportunityStatus.OPEN);
		return opportunity;
	}

	@Test
	@DisplayName("TC-01: chuyen giai doan thanh cong thi cap nhat xac suat tuong ung")
	void updatesProbabilityOnStageChange() {
		when(opportunityRepository.findById(1L)).thenReturn(Optional.of(openOpportunity(1L, OpportunityStage.APPROACH)));

		OpportunityRes result = service.changeStage(new StageChangeReq(1L, OpportunityStage.PROPOSAL));

		assertThat(result.stage()).isEqualTo("PROPOSAL");
		assertThat(result.probability()).isEqualByComparingTo("40");
	}

	@Test
	@DisplayName("TC-01: chot giai doan WON thi xac suat 100, chot LOST thi xac suat 0")
	void setsTerminalProbabilities() {
		when(opportunityRepository.findById(1L)).thenReturn(Optional.of(openOpportunity(1L, OpportunityStage.NEGOTIATION)));
		OpportunityRes won = service.changeStage(new StageChangeReq(1L, OpportunityStage.WON));
		assertThat(won.probability()).isEqualByComparingTo("100");

		when(opportunityRepository.findById(2L)).thenReturn(Optional.of(openOpportunity(2L, OpportunityStage.NEGOTIATION)));
		OpportunityRes lost = service.changeStage(new StageChangeReq(2L, OpportunityStage.LOST));
		assertThat(lost.probability()).isEqualByComparingTo("0");
	}

	@Test
	@DisplayName("TC-02: chuyen dung giai doan ke tiep thi thanh cong")
	void allowsSequentialTransition() {
		when(opportunityRepository.findById(1L)).thenReturn(Optional.of(openOpportunity(1L, OpportunityStage.PROPOSAL)));

		OpportunityRes result = service.changeStage(new StageChangeReq(1L, OpportunityStage.NEGOTIATION));

		assertThat(result.stage()).isEqualTo("NEGOTIATION");
	}

	@Test
	@DisplayName("TC-02: nhay coc giai doan (bo qua trung gian) thi bao INVALID_STATE, khong luu")
	void rejectsSkippedStageTransition() {
		when(opportunityRepository.findById(1L)).thenReturn(Optional.of(openOpportunity(1L, OpportunityStage.APPROACH)));

		assertThatThrownBy(() -> service.changeStage(new StageChangeReq(1L, OpportunityStage.NEGOTIATION)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);

		verify(opportunityRepository, never()).save(any());
		verify(stageHistoryRepository, never()).save(any());
	}

	@Test
	@DisplayName("TC-02: chuyen lui giai doan thi bao INVALID_STATE")
	void rejectsBackwardStageTransition() {
		when(opportunityRepository.findById(1L)).thenReturn(Optional.of(openOpportunity(1L, OpportunityStage.NEGOTIATION)));

		assertThatThrownBy(() -> service.changeStage(new StageChangeReq(1L, OpportunityStage.APPROACH)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);

		verify(opportunityRepository, never()).save(any());
	}

	@Test
	@DisplayName("TC-03: chot giai doan WON/LOST thi dong co hoi (status = CLOSED)")
	void closesOpportunityWhenReachingTerminalStage() {
		when(opportunityRepository.findById(1L)).thenReturn(Optional.of(openOpportunity(1L, OpportunityStage.NEGOTIATION)));

		service.changeStage(new StageChangeReq(1L, OpportunityStage.WON));

		ArgumentCaptor<Opportunity> captor = ArgumentCaptor.forClass(Opportunity.class);
		verify(opportunityRepository).save(captor.capture());
		assertThat(captor.getValue().getStatus()).isEqualTo(OpportunityStatus.CLOSED);
	}

	@Test
	@DisplayName("TC-03: co hoi da dong thi khong cho chuyen giai doan nua, khong luu")
	void rejectsChangingStageOfClosedOpportunity() {
		Opportunity closed = openOpportunity(1L, OpportunityStage.WON);
		closed.setStatus(OpportunityStatus.CLOSED);
		when(opportunityRepository.findById(1L)).thenReturn(Optional.of(closed));

		assertThatThrownBy(() -> service.changeStage(new StageChangeReq(1L, OpportunityStage.PROPOSAL)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);

		verify(opportunityRepository, never()).save(any());
		verify(stageHistoryRepository, never()).save(any());
	}

	@Test
	@DisplayName("Khong tim thay co hoi thi bao RESOURCE_NOT_FOUND")
	void rejectsWhenOpportunityMissing() {
		when(opportunityRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.changeStage(new StageChangeReq(99L, OpportunityStage.PROPOSAL)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("TC-05: chuyen giai doan thanh cong thi ghi lich su voi giai doan cu/moi va nguoi thuc hien")
	void recordsStageHistoryOnChange() {
		when(opportunityRepository.findById(1L)).thenReturn(Optional.of(openOpportunity(1L, OpportunityStage.APPROACH)));
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);

		service.changeStage(new StageChangeReq(1L, OpportunityStage.PROPOSAL));

		ArgumentCaptor<OpportunityStageHistory> captor = ArgumentCaptor.forClass(OpportunityStageHistory.class);
		verify(stageHistoryRepository).save(captor.capture());
		OpportunityStageHistory saved = captor.getValue();
		assertThat(saved.getOpportunityId()).isEqualTo(1L);
		assertThat(saved.getFromStage()).isEqualTo(OpportunityStage.APPROACH);
		assertThat(saved.getToStage()).isEqualTo(OpportunityStage.PROPOSAL);
		assertThat(saved.getChangedBy()).isEqualTo(7L);
		assertThat(saved.getChangedAt()).isNotNull();
	}

	@Test
	@DisplayName("TC-05: lay lich su tra ve dung danh sach, moi nhat truoc")
	void returnsStageHistoryOrderedByMostRecent() {
		when(opportunityRepository.existsById(1L)).thenReturn(true);
		OpportunityStageHistory newest = new OpportunityStageHistory();
		newest.setId(2L);
		newest.setOpportunityId(1L);
		newest.setFromStage(OpportunityStage.APPROACH);
		newest.setToStage(OpportunityStage.PROPOSAL);
		OpportunityStageHistory oldest = new OpportunityStageHistory();
		oldest.setId(1L);
		oldest.setOpportunityId(1L);
		oldest.setToStage(OpportunityStage.APPROACH);
		when(stageHistoryRepository.findByOpportunityIdOrderByChangedAtDesc(1L))
				.thenReturn(List.of(newest, oldest));

		List<StageHistoryRes> result = service.history(1L);

		assertThat(result).hasSize(2);
		assertThat(result.get(0).toStage()).isEqualTo("PROPOSAL");
		assertThat(result.get(1).fromStage()).isNull();
	}

	@Test
	@DisplayName("TC-05: lay lich su cua co hoi khong ton tai thi bao RESOURCE_NOT_FOUND")
	void rejectsHistoryWhenOpportunityMissing() {
		when(opportunityRepository.existsById(99L)).thenReturn(false);

		assertThatThrownBy(() -> service.history(99L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}
}
