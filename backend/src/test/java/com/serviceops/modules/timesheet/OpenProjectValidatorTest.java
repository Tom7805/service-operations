package com.serviceops.modules.timesheet;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.timesheet.validator.OpenProjectValidator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Unit test cho {@link OpenProjectValidator} (NCL-06-CN-007 — Chan ghi gio vao
 * du an da dong, QTN-13).
 *
 * <p>Test tich hop day du hanh vi nay qua tang service/controller da co san o
 * {@code TimeEntryServiceTest#rejectsTimeLoggingOnClosedProject} va
 * {@code TimeEntryControllerIT} (vi validator dung chung cho luong ghi gio cong
 * cua NCL-06-CN-001) — file nay bo sung test don vi rieng cho chinh validator,
 * tach bach khoi story 001 de tra cuu/traceability ro rang theo story.</p>
 */
class OpenProjectValidatorTest {

	private final OpenProjectValidator validator = new OpenProjectValidator();

	@Test
	void allowsLoggingWhenProjectIsRunning() {
		Project project = new Project();
		project.setStatus(ProjectStatus.RUNNING);

		assertDoesNotThrow(() -> validator.validate(project));
	}

	@Test
	void rejectsLoggingWhenProjectIsClosed_QTN13() {
		Project project = new Project();
		project.setStatus(ProjectStatus.CLOSED);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> validator.validate(project));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}
}
