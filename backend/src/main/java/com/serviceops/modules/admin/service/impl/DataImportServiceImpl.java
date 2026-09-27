package com.serviceops.modules.admin.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.dto.request.ImportCommitReq;
import com.serviceops.modules.admin.dto.response.ImportPreviewRes;
import com.serviceops.modules.admin.dto.response.ImportResultRes;
import com.serviceops.modules.admin.entity.ImportError;
import com.serviceops.modules.admin.entity.ImportJob;
import com.serviceops.modules.admin.enums.DuplicateAction;
import com.serviceops.modules.admin.enums.ImportErrorStage;
import com.serviceops.modules.admin.enums.ImportRowStatus;
import com.serviceops.modules.admin.enums.ImportStatus;
import com.serviceops.modules.admin.enums.ImportTargetType;
import com.serviceops.modules.admin.importer.ImportHandler;
import com.serviceops.modules.admin.importer.ImportHandler.RowCheck;
import com.serviceops.modules.admin.importer.ImportRowParser;
import com.serviceops.modules.admin.mapper.AdminMapper;
import com.serviceops.modules.admin.repository.ImportErrorRepository;
import com.serviceops.modules.admin.repository.ImportJobRepository;
import com.serviceops.modules.admin.service.DataImportService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import static com.serviceops.modules.admin.service.impl.AdminSupport.blankToNull;
import static com.serviceops.modules.admin.service.impl.AdminSupport.currentUsername;

/**
 * NCL-15-CN-004: nhap du lieu khach hang va nhan su tu tep.
 *
 * <ol>
 *   <li><b>Xem truoc</b>: doc tep, kiem tra tung dong, luu phien nhap cung noi dung tep — chua ghi du lieu nghiep vu
 *       nao. Dong loi (TC-02) luu vao {@code import_errors} de liet ke lai.</li>
 *   <li><b>Xac nhan nhap</b>: kiem tra LAI tren du lieu moi nhat (ho so co the vua duoc tao o man hinh khac), roi
 *       tao moi dong hop le (TC-01) va bo qua / cap nhat dong trung theo lua chon (TC-03). Moi dong ghi trong giao
 *       dich rieng cua service nghiep vu: mot dong that bai khong keo cac dong khac rollback — dong do duoc ghi vao
 *       danh sach loi {@code COMMIT} de sua lai.</li>
 * </ol>
 * TC-04: chi Quan tri vien (controller); TC-05: moi lan xem truoc / nhap ghi Nhat ky he thong. QTN-04: moi phan hoi
 * kem loi nhac chi dung du lieu mo phong.
 */
@Slf4j
@Service
public class DataImportServiceImpl implements DataImportService {

	public static final String SIMULATED_DATA_NOTICE = "Chi nhap du lieu MO PHONG phuc vu trinh dien (QTN-04)."
			+ " Khong dua du lieu khach hang hay nhan su that vao he thong.";

	private final Map<ImportTargetType, ImportHandler> handlers = new EnumMap<>(ImportTargetType.class);
	private final ImportRowParser parser;
	private final ImportJobRepository jobRepository;
	private final ImportErrorRepository errorRepository;
	private final AdminMapper mapper;
	private final AuditLogService auditLogService;
	private final Clock clock;
	/** Chan hai lan xac nhan dong thoi cho cung mot phien nhap (bam nut hai lan). */
	private final Set<Long> committing = ConcurrentHashMap.newKeySet();

	public DataImportServiceImpl(List<ImportHandler> handlerList, ImportRowParser parser, ImportJobRepository jobRepository,
			ImportErrorRepository errorRepository, AdminMapper mapper, AuditLogService auditLogService, Clock clock) {
		handlerList.forEach(handler -> handlers.put(handler.targetType(), handler));
		this.parser = parser;
		this.jobRepository = jobRepository;
		this.errorRepository = errorRepository;
		this.mapper = mapper;
		this.auditLogService = auditLogService;
		this.clock = clock;
	}

	@Override
	public byte[] template(ImportTargetType targetType) {
		ImportHandler handler = handler(targetType);
		String csv = "﻿" + csvLine(handler.templateHeaders()) + "\r\n" + csvLine(handler.templateSample()) + "\r\n";
		return csv.getBytes(StandardCharsets.UTF_8);
	}

	@Override
	@Transactional
	public ImportPreviewRes preview(ImportTargetType targetType, String fileName, byte[] content) {
		ImportHandler handler = handler(targetType);
		if (content == null || content.length == 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Tep tai len rong");
		}
		String text = parser.decode(content);
		ImportRowParser.ParsedFile parsed = parser.parse(text, handler.headerAliases());
		if (parsed.rows().isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Tep chi co dong tieu de, khong co dong du lieu");
		}
		List<RowCheck> checks = handler.check(parsed.rows());

		ImportJob job = new ImportJob();
		job.setTargetType(targetType);
		job.setStatus(ImportStatus.PREVIEWED);
		job.setFileName(fileName == null || fileName.isBlank() ? "import.csv" : fileName.trim());
		job.setFileContent(text);
		job.setCreatedBy(currentUsername());
		job.setCreatedAt(LocalDateTime.now(clock));
		applyCounts(job, checks);
		job = jobRepository.save(job);
		errorRepository.saveAll(validationErrors(job.getId(), checks));

		log.info("IMPORT_PREVIEWED jobId={} type={} rows={} valid={} invalid={} duplicate={}", job.getId(), targetType,
				job.getTotalRows(), job.getValidRows(), job.getInvalidRows(), job.getDuplicateRows());
		auditLogService.record("Tải tệp nhập dữ liệu", AuditTargetType.SYSTEM, job.getId(), label(job),
				"Xem truoc tep " + job.getFileName() + ": " + job.getTotalRows() + " dong, " + job.getValidRows()
						+ " hop le, " + job.getInvalidRows() + " loi, " + job.getDuplicateRows() + " trung ho so da co");
		return mapper.toImportPreviewRes(job, checks, SIMULATED_DATA_NOTICE);
	}

	@Override
	public ImportResultRes commit(Long jobId, ImportCommitReq request) {
		if (!committing.add(jobId)) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Phien nhap #" + jobId + " dang duoc xu ly");
		}
		try {
			return doCommit(jobId, request == null ? new ImportCommitReq(null, null) : request);
		} finally {
			committing.remove(jobId);
		}
	}

	private ImportResultRes doCommit(Long jobId, ImportCommitReq request) {
		ImportJob job = requireJob(jobId);
		if (job.getStatus() != ImportStatus.PREVIEWED) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Phien nhap #" + jobId + " da duoc nhap truoc do, hay tai tep len lai neu can nhap them");
		}
		ImportHandler handler = handler(job.getTargetType());
		List<RowCheck> checks = handler.check(parser.parse(job.getFileContent(), handler.headerAliases()).rows());
		Map<Integer, DuplicateAction> actions = resolveDuplicateActions(checks, request);

		List<ImportError> errors = new ArrayList<>(validationErrors(job.getId(), checks));
		int created = 0;
		int updated = 0;
		int skipped = 0;
		for (RowCheck row : checks) {
			if (row.status() == ImportRowStatus.INVALID) {
				continue;
			}
			if (row.status() == ImportRowStatus.DUPLICATE && actions.get(row.rowNumber()) == DuplicateAction.SKIP) {
				skipped++;
				continue;
			}
			try {
				if (row.status() == ImportRowStatus.VALID) {
					handler.create(row);
					created++;
				} else {
					handler.update(row);
					updated++;
				}
			} catch (RuntimeException failure) {
				log.warn("IMPORT_ROW_FAILED jobId={} row={} reason={}", jobId, row.rowNumber(), failure.getMessage());
				errors.add(error(job.getId(), row, ImportErrorStage.COMMIT,
						failure instanceof BusinessRuleException && failure.getMessage() != null
								? failure.getMessage() : "Loi khi ghi du lieu: " + failure.getClass().getSimpleName()));
			}
		}
		int failed = (int) errors.stream().filter(e -> e.getStage() == ImportErrorStage.COMMIT).count();

		applyCounts(job, checks);
		job.setCreatedCount(created);
		job.setUpdatedCount(updated);
		job.setSkippedCount(skipped);
		job.setFailedCount(failed);
		job.setDuplicateAction(request.duplicateAction());
		job.setStatus(failed == 0 ? ImportStatus.COMMITTED : ImportStatus.COMMITTED_WITH_ERRORS);
		job.setCommittedBy(currentUsername());
		job.setCommittedAt(LocalDateTime.now(clock));
		job = jobRepository.save(job);
		errorRepository.deleteAll(errorRepository.findByImportJobIdOrderByRowNumberAsc(job.getId()));
		errorRepository.saveAll(errors);

		log.info("IMPORT_COMMITTED jobId={} created={} updated={} skipped={} invalid={} failed={}", jobId, created,
				updated, skipped, job.getInvalidRows(), failed);
		auditLogService.record("Nhập dữ liệu từ tệp", AuditTargetType.SYSTEM, job.getId(), label(job),
				"Nhap tep " + job.getFileName() + ": tao moi " + created + ", cap nhat " + updated + ", bo qua trung "
						+ skipped + ", dong loi khong nhap " + job.getInvalidRows() + ", ghi that bai " + failed);
		return get(job.getId());
	}

	@Override
	@Transactional(readOnly = true)
	public ImportResultRes get(Long jobId) {
		ImportJob job = requireJob(jobId);
		return mapper.toImportResultRes(job, errorRepository.findByImportJobIdOrderByRowNumberAsc(jobId),
				SIMULATED_DATA_NOTICE);
	}

	@Override
	@Transactional(readOnly = true)
	public List<ImportResultRes> list() {
		return jobRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
				.map(job -> mapper.toImportResultRes(job, null, null))
				.toList();
	}

	/**
	 * TC-03: moi dong trung phai co lua chon bo qua / cap nhat — lay tu {@code rowActions}, thieu thi dung
	 * {@code duplicateAction}. Con dong trung chua co lua chon nao thi 400, khong nhap gi ca.
	 */
	private static Map<Integer, DuplicateAction> resolveDuplicateActions(List<RowCheck> checks, ImportCommitReq request) {
		Map<Integer, DuplicateAction> perRow = new HashMap<>();
		if (request.rowActions() != null) {
			request.rowActions().forEach(action -> perRow.put(action.rowNumber(), action.action()));
		}
		Map<Integer, DuplicateAction> resolved = new HashMap<>();
		List<Integer> undecided = new ArrayList<>();
		for (RowCheck row : checks) {
			if (row.status() != ImportRowStatus.DUPLICATE) {
				continue;
			}
			DuplicateAction action = perRow.getOrDefault(row.rowNumber(), request.duplicateAction());
			if (action == null) {
				undecided.add(row.rowNumber());
			} else {
				resolved.put(row.rowNumber(), action);
			}
		}
		if (!undecided.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Tep co dong trung ho so da co " + undecided
					+ ", hay chon bo qua (SKIP) hoac cap nhat (UPDATE) truoc khi nhap");
		}
		return resolved;
	}

	private static void applyCounts(ImportJob job, List<RowCheck> checks) {
		Map<ImportRowStatus, Long> counts = checks.stream()
				.collect(Collectors.groupingBy(RowCheck::status, Collectors.counting()));
		job.setTotalRows(checks.size());
		job.setValidRows(counts.getOrDefault(ImportRowStatus.VALID, 0L).intValue());
		job.setInvalidRows(counts.getOrDefault(ImportRowStatus.INVALID, 0L).intValue());
		job.setDuplicateRows(counts.getOrDefault(ImportRowStatus.DUPLICATE, 0L).intValue());
	}

	private static List<ImportError> validationErrors(Long jobId, List<RowCheck> checks) {
		return checks.stream()
				.filter(row -> row.status() == ImportRowStatus.INVALID)
				.map(row -> error(jobId, row, ImportErrorStage.VALIDATION, String.join("; ", row.errors())))
				.toList();
	}

	private static ImportError error(Long jobId, RowCheck row, ImportErrorStage stage, String message) {
		ImportError error = new ImportError();
		error.setImportJobId(jobId);
		error.setRowNumber(row.rowNumber());
		error.setStage(stage);
		// Cot message NOT NULL: exception khong co message ma de null thi saveAll vo SAU khi cac dong khac da ghi.
		error.setMessage(Objects.requireNonNullElse(truncate(message, 1000), "Loi khong xac dinh"));
		error.setRawData(truncate(row.raw(), 2000));
		return error;
	}

	private ImportHandler handler(ImportTargetType targetType) {
		ImportHandler handler = targetType == null ? null : handlers.get(targetType);
		if (handler == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Loai du lieu nhap phai la CUSTOMER hoac EMPLOYEE");
		}
		return handler;
	}

	private ImportJob requireJob(Long jobId) {
		return jobRepository.findById(jobId).orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
				"Khong tim thay phien nhap voi id=" + jobId));
	}

	private static String label(ImportJob job) {
		return (job.getTargetType() == ImportTargetType.CUSTOMER ? "Nhập khách hàng" : "Nhập nhân sự")
				+ " - " + job.getFileName();
	}

	private static String csvLine(List<String> cells) {
		return cells.stream()
				.map(cell -> cell.contains(",") || cell.contains("\"") ? "\"" + cell.replace("\"", "\"\"") + "\"" : cell)
				.collect(Collectors.joining(","));
	}

	private static String truncate(String value, int max) {
		String text = blankToNull(value);
		return text == null || text.length() <= max ? text : text.substring(0, max);
	}
}
