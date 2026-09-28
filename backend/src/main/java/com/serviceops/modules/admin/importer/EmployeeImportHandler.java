package com.serviceops.modules.admin.importer;

import com.serviceops.modules.admin.enums.ImportRowStatus;
import com.serviceops.modules.admin.enums.ImportTargetType;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import com.serviceops.modules.identity.employee.dto.request.EmployeeCreateReq;
import com.serviceops.modules.identity.employee.dto.request.EmployeeUpdateReq;
import com.serviceops.modules.identity.employee.dto.response.EmployeeDetailRes;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.employee.service.EmployeeService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * NCL-15-CN-004: nhap ho so nhan su tu tep. Ho so nhan su luon gan voi mot tai khoan dang nhap da co
 * (NCL-01-CN-007) nen cot bat buoc la ten dang nhap; tai khoan chua co thi dong do INVALID — tao tai khoan van qua
 * man hinh Quan ly tai khoan de gan dung vai tro va pham vi du lieu.
 *
 * <ul>
 *   <li>TC-02: thieu ten dang nhap / ngay vao lam, ngay sai dinh dang, ngay ket thuc som hon ngay vao lam, gio chuan
 *       ngoai khoang (0, 168], bo phan khong ton tai -> INVALID;</li>
 *   <li>TC-03: tai khoan da co ho so nhan su -> DUPLICATE (bo qua hoac cap nhat ho so do).</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class EmployeeImportHandler implements ImportHandler {

	static final BigDecimal MAX_HOURS_PER_WEEK = BigDecimal.valueOf(168);
	private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
			DateTimeFormatter.ISO_LOCAL_DATE, DateTimeFormatter.ofPattern("d/M/uuuu"));

	private final EmployeeService employeeService;
	private final EmployeeRepository employeeRepository;
	private final UserRepository userRepository;
	private final DepartmentRepository departmentRepository;

	@Override
	public ImportTargetType targetType() {
		return ImportTargetType.EMPLOYEE;
	}

	@Override
	public List<String> templateHeaders() {
		return List.of("Tên đăng nhập", "Bộ phận", "Vai trò chuyên môn", "Cấp bậc", "Ngày vào làm",
				"Ngày kết thúc", "Giờ chuẩn/tuần");
	}

	@Override
	public List<String> templateSample() {
		return List.of("nv.mophong01", "Phòng Phát triển", "Lập trình viên", "Senior", "2026-01-05", "", "40");
	}

	@Override
	public Map<String, String> headerAliases() {
		Map<String, String> aliases = new HashMap<>();
		alias(aliases, "username", "Tên đăng nhập", "Tài khoản", "username");
		alias(aliases, "department", "Bộ phận", "Phòng ban", "department");
		alias(aliases, "professionalRole", "Vai trò chuyên môn", "Chức danh", "professionalRole");
		alias(aliases, "level", "Cấp bậc", "level");
		alias(aliases, "hireDate", "Ngày vào làm", "hireDate");
		alias(aliases, "endDate", "Ngày kết thúc", "Ngày kết thúc hợp đồng", "endDate");
		alias(aliases, "standardHoursPerWeek", "Giờ chuẩn/tuần", "Giờ làm việc chuẩn", "Giờ chuẩn",
				"standardHoursPerWeek");
		return aliases;
	}

	@Override
	public List<RowCheck> check(List<ImportRowParser.ParsedRow> rows) {
		Map<String, List<Department>> departmentsByName = departmentRepository.findAll().stream()
				.collect(Collectors.groupingBy(d -> d.getName().trim().toLowerCase(Locale.ROOT)));
		Map<String, Integer> seenUsernames = new HashMap<>();
		List<RowCheck> result = new ArrayList<>(rows.size());
		for (ImportRowParser.ParsedRow row : rows) {
			Map<String, String> v = row.values();
			List<String> errors = new ArrayList<>();

			String username = v.get("username");
			User user = null;
			if (username == null) {
				errors.add("Ten dang nhap khong duoc de trong");
			} else {
				Integer sameUser = seenUsernames.putIfAbsent(username.toLowerCase(Locale.ROOT), row.rowNumber());
				if (sameUser != null) {
					errors.add("Trung ten dang nhap voi dong " + sameUser + " trong tep");
				}
				user = userRepository.findByUsername(username).orElse(null);
				if (user == null) {
					errors.add("Khong tim thay tai khoan " + username + ", hay tao tai khoan truoc khi nhap ho so");
				}
			}

			Long departmentId = null;
			String departmentName = v.get("department");
			if (departmentName != null) {
				List<Department> matches = departmentsByName.getOrDefault(departmentName.toLowerCase(Locale.ROOT), List.of());
				if (matches.isEmpty()) {
					errors.add("Khong tim thay bo phan " + departmentName);
				} else if (matches.size() > 1) {
					errors.add("Co nhieu bo phan cung ten " + departmentName + ", khong xac dinh duoc bo phan can gan");
				} else {
					departmentId = matches.get(0).getId();
				}
			}

			LocalDate hireDate = parseDate(v.get("hireDate"), "Ngay vao lam", true, errors);
			LocalDate endDate = parseDate(v.get("endDate"), "Ngay ket thuc", false, errors);
			if (hireDate != null && endDate != null && endDate.isBefore(hireDate)) {
				errors.add("Ngay ket thuc hop dong lao dong som hon ngay vao lam");
			}
			BigDecimal hours = parseHours(v.get("standardHoursPerWeek"), errors);
			maxLength(v.get("professionalRole"), 255, "Vai tro chuyen mon", errors);
			maxLength(v.get("level"), 100, "Cap bac", errors);

			if (!errors.isEmpty()) {
				result.add(new RowCheck(row.rowNumber(), v, row.raw(), ImportRowStatus.INVALID, errors, null, null, null));
				continue;
			}
			EmployeeCreateReq request = new EmployeeCreateReq(user.getId(), departmentId, v.get("professionalRole"),
					hireDate, endDate, hours, v.get("level"));
			Optional<Employee> existing = employeeRepository.findByUser_Id(user.getId());
			if (existing.isPresent()) {
				result.add(new RowCheck(row.rowNumber(), v, row.raw(), ImportRowStatus.DUPLICATE,
						List.of("Tai khoan " + user.getUsername() + " da co ho so nhan su"),
						existing.get().getId(), "Ho so nhan su cua " + user.getUsername(), request));
			} else {
				result.add(new RowCheck(row.rowNumber(), v, row.raw(), ImportRowStatus.VALID, List.of(), null, null,
						request));
			}
		}
		return result;
	}

	@Override
	public String create(RowCheck row) {
		EmployeeDetailRes created = employeeService.create((EmployeeCreateReq) row.payload());
		return "Ho so nhan su cua " + created.username();
	}

	@Override
	public String update(RowCheck row) {
		EmployeeCreateReq source = (EmployeeCreateReq) row.payload();
		EmployeeDetailRes updated = employeeService.update(row.duplicateOfId(), new EmployeeUpdateReq(
				source.departmentId(), source.professionalRole(), source.hireDate(), source.endDate(),
				source.standardHoursPerWeek(), source.level()));
		return "Ho so nhan su cua " + updated.username();
	}

	private static LocalDate parseDate(String value, String label, boolean required, List<String> errors) {
		if (value == null) {
			if (required) {
				errors.add(label + " khong duoc de trong");
			}
			return null;
		}
		for (DateTimeFormatter format : DATE_FORMATS) {
			try {
				return LocalDate.parse(value, format);
			} catch (DateTimeParseException ignored) {
				// thu dinh dang ke tiep
			}
		}
		errors.add(label + " khong dung dinh dang (yyyy-MM-dd hoac dd/MM/yyyy): " + value);
		return null;
	}

	private static BigDecimal parseHours(String value, List<String> errors) {
		if (value == null) {
			return null; // service tu dung mac dinh 40 gio
		}
		try {
			BigDecimal hours = new BigDecimal(value.replace(',', '.'));
			if (hours.signum() <= 0 || hours.compareTo(MAX_HOURS_PER_WEEK) > 0) {
				errors.add("Gio lam viec chuan phai lon hon 0 va khong qua 168 gio/tuan");
				return null;
			}
			return hours;
		} catch (NumberFormatException e) {
			errors.add("Gio lam viec chuan khong phai so: " + value);
			return null;
		}
	}

	private static void maxLength(String value, int max, String label, List<String> errors) {
		if (value != null && value.length() > max) {
			errors.add(label + " khong duoc qua " + max + " ky tu");
		}
	}

	private static void alias(Map<String, String> aliases, String field, String... headers) {
		for (String header : headers) {
			aliases.put(ImportRowParser.normalizeHeader(header), field);
		}
	}
}
