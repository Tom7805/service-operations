package com.serviceops.modules.admin;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.dto.request.ImportCommitReq;
import com.serviceops.modules.admin.dto.response.ImportPreviewRes;
import com.serviceops.modules.admin.dto.response.ImportResultRes;
import com.serviceops.modules.admin.enums.DuplicateAction;
import com.serviceops.modules.admin.enums.ImportErrorStage;
import com.serviceops.modules.admin.enums.ImportRowStatus;
import com.serviceops.modules.admin.enums.ImportStatus;
import com.serviceops.modules.admin.enums.ImportTargetType;
import com.serviceops.modules.admin.importer.CustomerImportHandler;
import com.serviceops.modules.admin.importer.EmployeeImportHandler;
import com.serviceops.modules.admin.importer.ImportRowParser;
import com.serviceops.modules.admin.mapper.AdminMapper;
import com.serviceops.modules.admin.service.DataImportService;
import com.serviceops.modules.admin.service.impl.DataImportServiceImpl;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.CustomerUpdateReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.service.CustomerDuplicateService;
import com.serviceops.modules.customer.service.CustomerService;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.department.enums.DepartmentType;
import com.serviceops.modules.identity.employee.dto.request.EmployeeCreateReq;
import com.serviceops.modules.identity.employee.dto.response.EmployeeDetailRes;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.service.EmployeeService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * BE-QA NCL-15-CN-004 tren JPA that: xem truoc - xac nhan nhap tep khach hang (TC-01, TC-02, TC-03, TC-05) va nhan
 * su. Ghi du lieu di qua {@code CustomerService} / {@code EmployeeService} — gia lap o day de kiem tra dung loi goi;
 * quy tac ben trong hai service do da co test rieng cua Epic NCL-01 / NCL-02. TC-04 (403) o {@code AdminControllerIT}.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({DataImportServiceImpl.class, CustomerImportHandler.class, EmployeeImportHandler.class, ImportRowParser.class,
		AdminMapper.class, DataImportServiceTest.Config.class})
class DataImportServiceTest {

	private static final String CUSTOMER_HEADER = "Tên khách hàng,Mã số thuế,Số điện thoại,Lĩnh vực,Địa chỉ\n";

	@TestConfiguration
	static class Config {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-09-25T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}

		@Bean
		@Primary
		Validator importValidator() {
			return Validation.buildDefaultValidatorFactory().getValidator();
		}
	}

	@MockBean private AuditLogService auditLogService;
	@MockBean private CustomerService customerService;
	@MockBean private CustomerDuplicateService customerDuplicateService;
	@MockBean private EmployeeService employeeService;
	@Autowired private DataImportService importService;
	@Autowired private TestEntityManager em;

	@BeforeEach
	void setUp() {
		when(customerDuplicateService.findDuplicates(anyString(), anyString(), anyString())).thenReturn(List.of());
		when(customerService.create(any())).thenAnswer(inv -> {
			CustomerCreateReq req = inv.getArgument(0);
			return new CustomerRes(1L, "KH000001", req.name(), req.taxCode(), req.phone(), null, null, null);
		});
	}

	@Test
	@DisplayName("TC-01: tep 100 dong hop le -> nhap du 100 ho so va bao ket qua")
	void importHundredValidRows() {
		StringBuilder csv = new StringBuilder(CUSTOMER_HEADER);
		for (int i = 1; i <= 100; i++) {
			csv.append("Cong ty Mo phong ").append(i).append(",01").append(String.format("%08d", i))
					.append(",,Phan mem,Ha Noi\n");
		}
		ImportPreviewRes preview = importService.preview(ImportTargetType.CUSTOMER, "kh.csv", bytes(csv.toString()));
		assertThat(preview.totalRows()).isEqualTo(100);
		assertThat(preview.validRows()).isEqualTo(100);
		assertThat(preview.notice()).contains("MO PHONG");
		verify(customerService, never()).create(any());

		ImportResultRes result = importService.commit(preview.jobId(), null);

		assertThat(result.status()).isEqualTo(ImportStatus.COMMITTED);
		assertThat(result.createdCount()).isEqualTo(100);
		assertThat(result.errors()).isEmpty();
		verify(customerService, times(100)).create(any());
		verify(auditLogService).record(eq("Nhập dữ liệu từ tệp"), eq(AuditTargetType.SYSTEM), eq(preview.jobId()),
				anyString(), anyString());
	}

	@Test
	@DisplayName("TC-02: 10 dong thieu ten -> bang xem truoc danh dau 10 dong loi, chi nhap cac dong con lai")
	void invalidRowsAreListedAndSkipped() {
		StringBuilder csv = new StringBuilder(CUSTOMER_HEADER);
		for (int i = 1; i <= 30; i++) {
			String name = i <= 10 ? "" : "Cong ty Mo phong " + i;
			// Dong thieu ten nhung con cot khac — dong trong hoan toan thi bo qua nhu dong trang cuoi tep Excel.
			csv.append(name).append(",,,Phan mem,Ha Noi\n");
		}
		ImportPreviewRes preview = importService.preview(ImportTargetType.CUSTOMER, "kh.csv", bytes(csv.toString()));

		assertThat(preview.invalidRows()).isEqualTo(10);
		assertThat(preview.rows()).filteredOn(row -> row.status() == ImportRowStatus.INVALID)
				.extracting(ImportPreviewRes.Row::rowNumber).containsExactly(2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
		assertThat(preview.rows().get(0).errors()).containsExactly("Ten khach hang khong duoc de trong");

		ImportResultRes result = importService.commit(preview.jobId(), new ImportCommitReq(null, null));
		assertThat(result.createdCount()).isEqualTo(20);
		assertThat(result.invalidRows()).isEqualTo(10);
		assertThat(result.errors()).hasSize(10).allMatch(e -> e.stage() == ImportErrorStage.VALIDATION);
		verify(customerService, times(20)).create(any());
	}

	@Test
	@DisplayName("TC-02: sai dinh dang ma so thue va trung trong chinh tep -> dong loi kem ly do")
	void formatAndInFileDuplicates() {
		String csv = CUSTOMER_HEADER
				+ "Cong ty A,123,,,\n"
				+ "Cong ty B,0101234567,,,\n"
				+ "Cong ty C,0101234567,,,\n"
				+ "\"Cong ty B\",,,,\n";
		ImportPreviewRes preview = importService.preview(ImportTargetType.CUSTOMER, "kh.csv", bytes(csv));

		assertThat(preview.rows()).extracting(ImportPreviewRes.Row::status).containsExactly(
				ImportRowStatus.INVALID, ImportRowStatus.VALID, ImportRowStatus.INVALID, ImportRowStatus.INVALID);
		assertThat(preview.rows().get(0).errors().get(0)).contains("Ma so thue khong dung dinh dang");
		assertThat(preview.rows().get(2).errors()).containsExactly("Trung ma so thue voi dong 3 trong tep");
		assertThat(preview.rows().get(3).errors()).containsExactly("Trung ten khach hang voi dong 3 trong tep");
	}

	@Test
	@DisplayName("TC-03: dong trung ho so da co -> canh bao, bat chon bo qua / cap nhat; UPDATE cap nhat ho so cu")
	void duplicatesRequireDecision() {
		when(customerDuplicateService.findDuplicates(eq("Cong ty Da Co"), anyString(), anyString())).thenReturn(List.of(
				new DuplicateCandidateRes(7L, "KH000007", "Cong ty Da Co", "0107777777", null, 1.0, List.of("maSoThue"))));
		when(customerService.update(eq(7L), any())).thenReturn(
				new CustomerRes(7L, "KH000007", "Cong ty Da Co", null, null, null, null, null));
		String csv = CUSTOMER_HEADER + "Cong ty Moi,,,,\nCong ty Da Co,0107777777,,Tu van,Da Nang\n";

		ImportPreviewRes preview = importService.preview(ImportTargetType.CUSTOMER, "kh.csv", bytes(csv));
		ImportPreviewRes.Row duplicate = preview.rows().get(1);
		assertThat(duplicate.status()).isEqualTo(ImportRowStatus.DUPLICATE);
		assertThat(duplicate.duplicateOfId()).isEqualTo(7L);
		assertThat(duplicate.errors().get(0)).contains("KH000007");

		assertThatThrownBy(() -> importService.commit(preview.jobId(), new ImportCommitReq(null, null)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
		verify(customerService, never()).create(any());

		ImportResultRes result = importService.commit(preview.jobId(), new ImportCommitReq(DuplicateAction.SKIP,
				List.of(new ImportCommitReq.RowAction(3, DuplicateAction.UPDATE))));
		assertThat(result.createdCount()).isEqualTo(1);
		assertThat(result.updatedCount()).isEqualTo(1);
		ArgumentCaptor<CustomerUpdateReq> update = ArgumentCaptor.forClass(CustomerUpdateReq.class);
		verify(customerService).update(eq(7L), update.capture());
		assertThat(update.getValue().address()).isEqualTo("Da Nang");
	}

	@Test
	@DisplayName("TC-03: chon SKIP -> dong trung bi bo qua; nhap lai phien da nhap -> INVALID_STATE")
	void skipDuplicatesAndNoDoubleCommit() {
		when(customerDuplicateService.findDuplicates(eq("Cong ty Da Co"), anyString(), anyString())).thenReturn(List.of(
				new DuplicateCandidateRes(7L, "KH000007", "Cong ty Da Co", null, null, 0.95, List.of("ten"))));
		ImportPreviewRes preview = importService.preview(ImportTargetType.CUSTOMER, "kh.csv",
				bytes(CUSTOMER_HEADER + "Cong ty Da Co,,,,\n"));

		ImportResultRes result = importService.commit(preview.jobId(), new ImportCommitReq(DuplicateAction.SKIP, null));
		assertThat(result.skippedCount()).isEqualTo(1);
		verify(customerService, never()).update(anyLong(), any());
		assertThatThrownBy(() -> importService.commit(preview.jobId(), new ImportCommitReq(DuplicateAction.SKIP, null)))
				.extracting("errorCode").isEqualTo(ErrorCode.INVALID_STATE);
	}

	@Test
	@DisplayName("Dong hop le nhung ghi that bai (ho so vua bi tao o man hinh khac) -> liet ke loi COMMIT, dong khac van nhap")
	void rowFailureDoesNotAbortOthers() {
		doAnswer(inv -> {
			CustomerCreateReq req = inv.getArgument(0);
			if (req.name().equals("Cong ty Xung Dot")) {
				throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Ho so khach hang co the trung");
			}
			return new CustomerRes(1L, "KH000001", req.name(), null, null, null, null, null);
		}).when(customerService).create(any());
		ImportPreviewRes preview = importService.preview(ImportTargetType.CUSTOMER, "kh.csv",
				bytes(CUSTOMER_HEADER + "Cong ty Xung Dot,,,,\nCong ty Binh Thuong,,,,\n"));

		ImportResultRes result = importService.commit(preview.jobId(), null);
		assertThat(result.status()).isEqualTo(ImportStatus.COMMITTED_WITH_ERRORS);
		assertThat(result.createdCount()).isEqualTo(1);
		assertThat(result.failedCount()).isEqualTo(1);
		assertThat(result.errors()).singleElement().satisfies(error -> {
			assertThat(error.rowNumber()).isEqualTo(2);
			assertThat(error.stage()).isEqualTo(ImportErrorStage.COMMIT);
			assertThat(error.message()).contains("trung");
		});
	}

	@Test
	@DisplayName("Tep Excel luu dang cham phay + ma windows-1258 van doc dung tieu de tieng Viet")
	void excelSemicolonAndLegacyEncoding() {
		// Chi dung ky tu co san trong windows-1258 (ê, á, à, ô) — dung nhu tep Excel tieng Viet xuat ra.
		String csv = "Tên khách hàng;MST\nCông ty Mô Phong;0101234567\n";
		ImportPreviewRes preview = importService.preview(ImportTargetType.CUSTOMER, "kh.csv",
				csv.getBytes(Charset.forName("windows-1258")));
		assertThat(preview.validRows()).isEqualTo(1);
		assertThat(preview.rows().get(0).data()).containsEntry("taxCode", "0101234567");
	}

	@Test
	@DisplayName("Tep sai mau (cot la) hoac chi co tieu de -> VALIDATION_ERROR, khong tao phien nhap")
	void wrongTemplateRejected() {
		assertThatThrownBy(() -> importService.preview(ImportTargetType.CUSTOMER, "kh.csv", bytes("Ho ten,Luong\nA,1\n")))
				.hasMessageContaining("khong nhan ra cot");
		assertThatThrownBy(() -> importService.preview(ImportTargetType.CUSTOMER, "kh.csv", bytes(CUSTOMER_HEADER)))
				.extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
		assertThat(importService.list()).isEmpty();
	}

	@Test
	@DisplayName("Nhan su: tai khoan chua co / ngay ket thuc som hon ngay vao lam -> loi; da co ho so -> trung")
	void employeeRows() {
		User existing = user("nv.coho");
		User fresh = user("nv.moi");
		Department dept = new Department();
		dept.setName("Phong Phat trien");
		dept.setType(DepartmentType.PHONG);
		em.persist(dept);
		Employee profile = new Employee();
		profile.setUser(existing);
		profile.setHireDate(LocalDate.of(2025, 1, 1));
		profile.setStandardHoursPerWeek(new BigDecimal("40"));
		em.persist(profile);
		when(employeeService.create(any())).thenReturn(employeeRes("nv.moi"));

		String csv = "Tên đăng nhập,Bộ phận,Vai trò chuyên môn,Cấp bậc,Ngày vào làm,Ngày kết thúc,Giờ chuẩn/tuần\n"
				+ "nv.moi,phong phat trien,Lap trinh vien,Senior,05/01/2026,,20\n"
				+ "nv.khongco,,,,2026-01-05,,\n"
				+ "nv.coho,,,,2026-01-05,2025-12-31,\n"
				+ "nv.coho,,,,2026-01-05,,\n";
		ImportPreviewRes preview = importService.preview(ImportTargetType.EMPLOYEE, "ns.csv", bytes(csv));

		assertThat(preview.rows()).extracting(ImportPreviewRes.Row::status).containsExactly(
				ImportRowStatus.VALID, ImportRowStatus.INVALID, ImportRowStatus.INVALID, ImportRowStatus.INVALID);
		assertThat(preview.rows().get(1).errors().get(0)).contains("Khong tim thay tai khoan nv.khongco");
		assertThat(preview.rows().get(2).errors()).contains("Ngay ket thuc hop dong lao dong som hon ngay vao lam");
		assertThat(preview.rows().get(3).errors()).contains("Trung ten dang nhap voi dong 4 trong tep");

		importService.commit(preview.jobId(), null);
		ArgumentCaptor<EmployeeCreateReq> created = ArgumentCaptor.forClass(EmployeeCreateReq.class);
		verify(employeeService).create(created.capture());
		assertThat(created.getValue().userId()).isEqualTo(fresh.getId());
		assertThat(created.getValue().departmentId()).isEqualTo(dept.getId());
		assertThat(created.getValue().hireDate()).isEqualTo(LocalDate.of(2026, 1, 5));
		assertThat(created.getValue().standardHoursPerWeek()).isEqualByComparingTo("20");

		ImportPreviewRes again = importService.preview(ImportTargetType.EMPLOYEE, "ns.csv",
				bytes("Tên đăng nhập,Ngày vào làm\nnv.coho,2025-01-01\n"));
		assertThat(again.rows().get(0).status()).isEqualTo(ImportRowStatus.DUPLICATE);
		assertThat(again.rows().get(0).duplicateOfId()).isEqualTo(profile.getId());
		verify(employeeService, never()).update(anyLong(), isNull());
	}

	@Test
	@DisplayName("Tep mau co BOM UTF-8, tieu de dung thu tu va dong du lieu mo phong")
	void templateHasBomAndSample() {
		String template = new String(importService.template(ImportTargetType.CUSTOMER), StandardCharsets.UTF_8);
		assertThat(template).startsWith("﻿Tên khách hàng,Mã số thuế").contains("Mô Phỏng");
	}

	private User user(String username) {
		User user = new User();
		user.setUsername(username);
		user.setPasswordHash("x");
		user.setFullName(username);
		user.setStatus(UserStatus.ACTIVE);
		return em.persist(user);
	}

	private static EmployeeDetailRes employeeRes(String username) {
		return new EmployeeDetailRes(1L, 1L, username, username, null, null, null, null, null, null, null, null,
				List.of(), null);
	}

	private static byte[] bytes(String text) {
		return text.getBytes(StandardCharsets.UTF_8);
	}
}
