package com.serviceops.modules.admin.importer;

import com.serviceops.modules.admin.enums.ImportRowStatus;
import com.serviceops.modules.admin.enums.ImportTargetType;

import java.util.List;
import java.util.Map;

/**
 * Xu ly nhap mot loai du lieu (NCL-15-CN-004). Moi loai tu khai bao cot mau, tu kiem tra tung dong va tu ghi
 * du lieu qua service nghiep vu cua module do — de moi quy tac cua luong nhap tay (chong trung khach hang,
 * ngay vao lam / nghi viec cua nhan su...) cung ap dung cho luong nhap tep.
 */
public interface ImportHandler {

	ImportTargetType targetType();

	/** Tieu de cot cua tep mau, theo thu tu. */
	List<String> templateHeaders();

	/** Mot dong du lieu mau (du lieu mo phong — QTN-04). */
	List<String> templateSample();

	/** Anh xa tieu de da chuan hoa ({@link ImportRowParser#normalizeHeader}) sang ten truong chuan. */
	Map<String, String> headerAliases();

	/**
	 * Kiem tra toan bo cac dong: loi du lieu (TC-02), trung lap trong chinh tep, trung ho so da co (TC-03).
	 * Tra ve dung thu tu cac dong dau vao.
	 */
	List<RowCheck> check(List<ImportRowParser.ParsedRow> rows);

	/** Tao moi ban ghi tu dong {@code VALID}. @return nhan de hien thi (VD ma khach hang vua tao). */
	String create(RowCheck row);

	/** Cap nhat ho so da co tu dong {@code DUPLICATE} (nguoi dung chon UPDATE). */
	String update(RowCheck row);

	/**
	 * Ket qua kiem tra mot dong.
	 *
	 * @param duplicateOfId    id ban ghi da co bi trung (chi khi {@code DUPLICATE}).
	 * @param duplicateOfLabel nhan de hien thi ban ghi bi trung.
	 * @param payload          du lieu da chuan hoa de ghi (request cua service nghiep vu); {@code null} khi INVALID.
	 */
	record RowCheck(int rowNumber, Map<String, String> values, String raw, ImportRowStatus status,
			List<String> errors, Long duplicateOfId, String duplicateOfLabel, Object payload) {
	}
}
