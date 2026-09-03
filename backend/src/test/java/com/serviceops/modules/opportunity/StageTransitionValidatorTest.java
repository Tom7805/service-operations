package com.serviceops.modules.opportunity;

import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.validator.StageTransitionValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit test StageTransitionValidator (QTN-06, dung boi NCL-03-CN-001 TC-01 de khoi tao
 * giai doan dau tien khi tao co hoi moi).
 */
class StageTransitionValidatorTest {

	private final StageTransitionValidator validator = new StageTransitionValidator();

	@Test
	@DisplayName("TC-01: co hoi moi luon khoi tao o giai doan APPROACH")
	void initialStageIsApproach() {
		assertThat(validator.initialStage()).isEqualTo(OpportunityStage.APPROACH);
	}

	@Test
	@DisplayName("QTN-06: cho phep chuyen tiep MOT BUOC lien ke dung thu tu")
	void allowsForwardTransition() {
		assertThat(validator.canTransition(OpportunityStage.APPROACH, OpportunityStage.PROPOSAL)).isTrue();
		assertThat(validator.canTransition(OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION)).isTrue();
	}

	@Test
	@DisplayName("TC-02/QTN-06: tu NEGOTIATION duoc chot sang WON hoac LOST")
	void allowsClosingFromNegotiation() {
		assertThat(validator.canTransition(OpportunityStage.NEGOTIATION, OpportunityStage.WON)).isTrue();
		assertThat(validator.canTransition(OpportunityStage.NEGOTIATION, OpportunityStage.LOST)).isTrue();
	}

	@Test
	@DisplayName("TC-02: khong cho phep nhay coc (bo qua giai doan trung gian)")
	void rejectsSkippedTransition() {
		assertThat(validator.canTransition(OpportunityStage.APPROACH, OpportunityStage.NEGOTIATION)).isFalse();
		assertThat(validator.canTransition(OpportunityStage.APPROACH, OpportunityStage.WON)).isFalse();
		assertThat(validator.canTransition(OpportunityStage.APPROACH, OpportunityStage.LOST)).isFalse();
		assertThat(validator.canTransition(OpportunityStage.PROPOSAL, OpportunityStage.WON)).isFalse();
		assertThat(validator.canTransition(OpportunityStage.PROPOSAL, OpportunityStage.LOST)).isFalse();
	}

	@Test
	@DisplayName("QTN-06: khong cho phep chuyen lui giai doan")
	void rejectsBackwardTransition() {
		assertThat(validator.canTransition(OpportunityStage.NEGOTIATION, OpportunityStage.APPROACH)).isFalse();
		assertThat(validator.canTransition(OpportunityStage.PROPOSAL, OpportunityStage.APPROACH)).isFalse();
	}

	@Test
	@DisplayName("TC-03: khong the chuyen tiep tu giai doan da chot (WON/LOST)")
	void rejectsTransitionFromClosedStage() {
		assertThat(validator.canTransition(OpportunityStage.WON, OpportunityStage.PROPOSAL)).isFalse();
		assertThat(validator.canTransition(OpportunityStage.WON, OpportunityStage.LOST)).isFalse();
		assertThat(validator.canTransition(OpportunityStage.LOST, OpportunityStage.APPROACH)).isFalse();
	}

	@Test
	@DisplayName("Giu nguyen giai doan hien tai thi hop le")
	void allowsSameStage() {
		assertThat(validator.canTransition(OpportunityStage.PROPOSAL, OpportunityStage.PROPOSAL)).isTrue();
	}

	@Test
	@DisplayName("Giai doan null thi khong hop le")
	void rejectsNullStages() {
		assertThat(validator.canTransition(null, OpportunityStage.PROPOSAL)).isFalse();
		assertThat(validator.canTransition(OpportunityStage.PROPOSAL, null)).isFalse();
	}
}
