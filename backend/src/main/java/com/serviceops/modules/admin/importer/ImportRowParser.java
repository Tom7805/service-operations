package com.serviceops.modules.admin.importer;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Doc tep bang tinh dang CSV (NCL-15-CN-004) — dinh dang Excel / Google Sheets / LibreOffice deu luu duoc.
 *
 * <ul>
 *   <li>Dau phan cach tu nhan: dau phay, cham phay (Excel ban dia Viet Nam) hoac tab — lay ky tu xuat hien nhieu
 *       nhat o dong tieu de;</li>
 *   <li>Chuan CSV: gia tri trong ngoac kep duoc chua dau phan cach, xuong dong va {@code ""} (ngoac kep ky tu);</li>
 *   <li>Ma hoa: UTF-8 (co hoac khong co BOM); tep khong phai UTF-8 hop le thi doc theo windows-1258 — ma mac dinh
 *       khi Excel tieng Viet luu "CSV (Comma delimited)";</li>
 *   <li>Tieu de cot so khop khong phan biet hoa thuong, dau tieng Viet va khoang trang ("Mã số thuế" = "ma so thue"
 *       = "taxCode").</li>
 * </ul>
 */
@Component
public class ImportRowParser {

	/** Gioi han de mot tep qua lon khong lam nghen may chu. */
	public static final int MAX_ROWS = 2000;

	public record ParsedRow(int rowNumber, Map<String, String> values, String raw) {}

	public record ParsedFile(List<String> headers, List<ParsedRow> rows) {}

	/** Giai ma noi dung tep tai len thanh chuoi. */
	public String decode(byte[] bytes) {
		try {
			String text = StandardCharsets.UTF_8.newDecoder()
					.onMalformedInput(CodingErrorAction.REPORT)
					.onUnmappableCharacter(CodingErrorAction.REPORT)
					.decode(ByteBuffer.wrap(bytes)).toString();
			return text.startsWith("﻿") ? text.substring(1) : text;
		} catch (CharacterCodingException notUtf8) {
			return new String(bytes, Charset.forName("windows-1258"));
		}
	}

	/**
	 * @param aliases anh xa tu tieu de da chuan hoa sang ten truong chuan (VD "masothue" -> "taxCode").
	 * @throws BusinessRuleException {@code VALIDATION_ERROR} khi tep rong, thieu dong tieu de, co cot la khong nhan
	 *                               ra hoac vuot {@link #MAX_ROWS} dong.
	 */
	public ParsedFile parse(String content, Map<String, String> aliases) {
		List<List<String>> records = split(content);
		// Bo cac dong trong hoan toan o cuoi / giua tep (Excel hay de lai).
		List<Integer> lineNumbers = new ArrayList<>();
		List<List<String>> nonEmpty = new ArrayList<>();
		for (int i = 0; i < records.size(); i++) {
			if (records.get(i).stream().anyMatch(cell -> !cell.isBlank())) {
				nonEmpty.add(records.get(i));
				lineNumbers.add(i + 1);
			}
		}
		if (nonEmpty.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Tep rong, khong co dong tieu de");
		}
		List<String> rawHeaders = nonEmpty.get(0);
		List<String> headers = new ArrayList<>();
		List<String> unknown = new ArrayList<>();
		for (String header : rawHeaders) {
			String field = aliases.get(normalizeHeader(header));
			if (field == null && !header.isBlank()) {
				unknown.add(header.trim());
			}
			headers.add(field);
		}
		if (!unknown.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Tep khong dung mau: khong nhan ra cot " + unknown + ". Hay tai tep mau va giu nguyen dong tieu de");
		}
		if (nonEmpty.size() - 1 > MAX_ROWS) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Tep co " + (nonEmpty.size() - 1) + " dong, vuot gioi han " + MAX_ROWS + " dong moi lan nhap");
		}
		List<ParsedRow> rows = new ArrayList<>();
		for (int i = 1; i < nonEmpty.size(); i++) {
			List<String> cells = nonEmpty.get(i);
			Map<String, String> values = new LinkedHashMap<>();
			for (int c = 0; c < headers.size(); c++) {
				if (headers.get(c) != null) {
					String cell = c < cells.size() ? cells.get(c).trim() : "";
					values.put(headers.get(c), cell.isEmpty() ? null : cell);
				}
			}
			rows.add(new ParsedRow(lineNumbers.get(i), values, String.join(" | ", cells)));
		}
		return new ParsedFile(headers, rows);
	}

	public static String normalizeHeader(String header) {
		String noAccent = Normalizer.normalize(header.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "")
				.replace('đ', 'd').replace('Đ', 'D');
		return noAccent.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
	}

	static List<List<String>> split(String content) {
		char delimiter = detectDelimiter(content);
		List<List<String>> records = new ArrayList<>();
		List<String> current = new ArrayList<>();
		StringBuilder cell = new StringBuilder();
		boolean quoted = false;
		for (int i = 0; i < content.length(); i++) {
			char ch = content.charAt(i);
			if (quoted) {
				if (ch == '"') {
					if (i + 1 < content.length() && content.charAt(i + 1) == '"') {
						cell.append('"');
						i++;
					} else {
						quoted = false;
					}
				} else {
					cell.append(ch);
				}
			} else if (ch == '"' && cell.length() == 0) {
				quoted = true;
			} else if (ch == delimiter) {
				current.add(cell.toString());
				cell.setLength(0);
			} else if (ch == '\n' || ch == '\r') {
				if (ch == '\r' && i + 1 < content.length() && content.charAt(i + 1) == '\n') {
					i++;
				}
				current.add(cell.toString());
				cell.setLength(0);
				records.add(current);
				current = new ArrayList<>();
			} else {
				cell.append(ch);
			}
		}
		if (cell.length() > 0 || !current.isEmpty()) {
			current.add(cell.toString());
			records.add(current);
		}
		return records;
	}

	private static char detectDelimiter(String content) {
		int end = content.indexOf('\n');
		String header = end < 0 ? content : content.substring(0, end);
		char best = ',';
		long bestCount = header.chars().filter(c -> c == ',').count();
		for (char candidate : new char[]{';', '\t'}) {
			long count = header.chars().filter(c -> c == candidate).count();
			if (count > bestCount) {
				best = candidate;
				bestCount = count;
			}
		}
		return best;
	}
}
