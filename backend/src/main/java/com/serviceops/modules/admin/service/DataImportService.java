package com.serviceops.modules.admin.service;

import com.serviceops.modules.admin.dto.request.ImportCommitReq;
import com.serviceops.modules.admin.dto.response.ImportPreviewRes;
import com.serviceops.modules.admin.dto.response.ImportResultRes;
import com.serviceops.modules.admin.enums.ImportTargetType;

import java.util.List;

/** NCL-15-CN-004: nhap khach hang va nhan su tu tep bang tinh (CSV) qua hai buoc xem truoc - xac nhan. */
public interface DataImportService {

	/** Tep mau (CSV UTF-8 co BOM de Excel hien dung tieng Viet) kem mot dong du lieu mo phong. */
	byte[] template(ImportTargetType targetType);

	/** Buoc 1: doc va kiem tra tung dong, luu phien nhap — CHUA ghi du lieu nao (TC-02, TC-03). */
	ImportPreviewRes preview(ImportTargetType targetType, String fileName, byte[] content);

	/** Buoc 2: kiem tra lai tren du lieu moi nhat roi nhap cac dong hop le / dong trung theo lua chon (TC-01, TC-03). */
	ImportResultRes commit(Long jobId, ImportCommitReq request);

	ImportResultRes get(Long jobId);

	List<ImportResultRes> list();
}
