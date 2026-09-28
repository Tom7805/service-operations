package com.serviceops.modules.admin.mapper;

import com.serviceops.modules.admin.dto.response.BackupRecordRes;
import com.serviceops.modules.admin.dto.response.CompanySettingRes;
import com.serviceops.modules.admin.dto.response.ImportPreviewRes;
import com.serviceops.modules.admin.dto.response.ImportResultRes;
import com.serviceops.modules.admin.dto.response.ServiceCatalogRes;
import com.serviceops.modules.admin.dto.response.ServicePriceRes;
import com.serviceops.modules.admin.entity.BackupRecord;
import com.serviceops.modules.admin.entity.CompanySetting;
import com.serviceops.modules.admin.entity.ImportError;
import com.serviceops.modules.admin.entity.ImportJob;
import com.serviceops.modules.admin.entity.ServiceCatalogItem;
import com.serviceops.modules.admin.entity.ServicePrice;
import com.serviceops.modules.admin.enums.BackupStatus;
import com.serviceops.modules.admin.importer.ImportHandler.RowCheck;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Chuyen entity cua Epic NCL-15 sang du lieu tra ve. */
@Component
public class AdminMapper {

	/**
	 * @param prices     moi moc gia cua dich vu (thu tu bat ky).
	 * @param asOf       ngay tra gia hieu luc (QTN-28).
	 * @param withPrices {@code true} de kem lich su moc gia (API chi tiet).
	 */
	public ServiceCatalogRes toCatalogRes(ServiceCatalogItem item, List<ServicePrice> prices, LocalDate asOf,
			boolean withPrices) {
		List<ServicePrice> ordered = prices.stream()
				.sorted(Comparator.comparing(ServicePrice::getEffectiveFrom))
				.toList();
		ServicePrice current = null;
		for (ServicePrice price : ordered) {
			if (!price.getEffectiveFrom().isAfter(asOf)) {
				current = price;
			}
		}
		List<ServicePriceRes> history = null;
		if (withPrices) {
			history = new ArrayList<>(ordered.size());
			for (int i = ordered.size() - 1; i >= 0; i--) {
				ServicePrice price = ordered.get(i);
				LocalDate effectiveTo = i + 1 < ordered.size() ? ordered.get(i + 1).getEffectiveFrom().minusDays(1) : null;
				history.add(new ServicePriceRes(price.getId(), price.getPrice(), price.getEffectiveFrom(), effectiveTo,
						price == current, price.getNote(), price.getCreatedBy(), price.getCreatedAt()));
			}
		}
		return new ServiceCatalogRes(item.getId(), item.getCode(), item.getName(), item.getUnit(), item.getDescription(),
				item.isActive(), asOf, current != null, current == null ? null : current.getPrice(),
				current == null ? null : current.getEffectiveFrom(), item.getCreatedBy(), item.getCreatedAt(),
				item.getUpdatedAt(), history);
	}

	public CompanySettingRes toCompanySettingRes(CompanySetting setting) {
		return new CompanySettingRes(true, setting.getCompanyName(), setting.getTaxCode(), setting.getAddress(),
				setting.getPhone(), setting.getEmail(), setting.getCurrency(), setting.getFiscalYearStartMonth(),
				setting.getStandardWorkingDaysPerMonth(), setting.getUpdatedBy(), setting.getUpdatedAt());
	}

	public BackupRecordRes toBackupRes(BackupRecord record) {
		return new BackupRecordRes(record.getId(), record.getCode(), record.getStatus(), record.getTriggerType(),
				record.getFileName(), record.getSizeBytes(), record.getChecksumSha256(), record.getTableCount(),
				record.getRowCount(), record.getNote(), record.getErrorMessage(), record.getCreatedBy(),
				record.getStartedAt(), record.getCompletedAt(), record.getStatus() == BackupStatus.COMPLETED);
	}

	public ImportPreviewRes toImportPreviewRes(ImportJob job, List<RowCheck> checks, String notice) {
		List<ImportPreviewRes.Row> rows = checks.stream()
				.map(row -> new ImportPreviewRes.Row(row.rowNumber(), row.status(), row.values(), row.errors(),
						row.duplicateOfId(), row.duplicateOfLabel()))
				.toList();
		return new ImportPreviewRes(job.getId(), job.getTargetType(), job.getFileName(), job.getStatus(),
				job.getTotalRows(), job.getValidRows(), job.getInvalidRows(), job.getDuplicateRows(), notice, rows);
	}

	/** @param errors {@code null} de luoc danh sach loi (API danh sach). */
	public ImportResultRes toImportResultRes(ImportJob job, List<ImportError> errors, String notice) {
		List<ImportResultRes.Error> errorRes = errors == null ? null : errors.stream()
				.map(e -> new ImportResultRes.Error(e.getRowNumber(), e.getStage(), e.getMessage(), e.getRawData()))
				.toList();
		return new ImportResultRes(job.getId(), job.getTargetType(), job.getFileName(), job.getStatus(),
				job.getTotalRows(), job.getValidRows(), job.getInvalidRows(), job.getDuplicateRows(),
				job.getCreatedCount(), job.getUpdatedCount(), job.getSkippedCount(), job.getFailedCount(),
				job.getDuplicateAction(), job.getCreatedBy(), job.getCreatedAt(), job.getCommittedBy(),
				job.getCommittedAt(), notice, errorRes);
	}
}
