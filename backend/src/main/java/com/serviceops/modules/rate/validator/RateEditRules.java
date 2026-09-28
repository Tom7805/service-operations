package com.serviceops.modules.rate.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Quy tac sua truc tiep mot dong don gia (dung chung cho bang don gia chung va don gia rieng theo hop dong).
 *
 * <p>Doanh thu ghi nhan va de nghi xuat hoa don "tinh dong" tu don gia hieu luc tai ngay cong (QTN-15) —
 * khong luu snapshot. Vi vay dong don gia DA AP DUNG TRUOC HOM NAY khong duoc sua de: sua se lam doi doanh
 * thu cac ky da tinh va lech voi hoa don da phat hanh. Muon doi gia thi khai bao muc moi co ngay hieu luc
 * moi (lich su giu nguyen). Dong chua ap dung hoac bat dau tu hom nay thi sua truc tiep duoc (sua nham).</p>
 */
public final class RateEditRules {

	private static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	private RateEditRules() {
	}

	public static void assertEditable(LocalDate currentEffectiveFrom, BigDecimal newDailyRate,
									  LocalDate newEffectiveFrom, LocalDate today) {
		if (currentEffectiveFrom.isBefore(today)) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Đơn giá này đã áp dụng từ " + currentEffectiveFrom.format(VN_DATE)
							+ " nên không sửa trực tiếp được (sẽ làm đổi doanh thu các kỳ đã tính). "
							+ "Hãy khai báo mức mới có hiệu lực từ hôm nay trở đi.");
		}
		if (newDailyRate == null || newDailyRate.compareTo(BigDecimal.ZERO) < 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Đơn giá theo ngày không được âm");
		}
		if (newEffectiveFrom == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngày hiệu lực không được để trống");
		}
		if (newEffectiveFrom.isBefore(today)) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ngày hiệu lực mới không được trước hôm nay (" + today.format(VN_DATE) + ")");
		}
	}

	public static String formatDate(LocalDate date) {
		return date.format(VN_DATE);
	}
}
