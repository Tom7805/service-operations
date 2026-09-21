package com.serviceops.modules.invoice.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * QTN-19: tong gia tri da xuat hoa don cua hop dong khong duoc vuot gia tri hop
 * dong (da gom phu luc, {@code totalValue}). Neu vuot, chan va yeu cau lap phu luc
 * dieu chinh truoc (NCL-04-CN-004). Han muc tran ({@code limitValue}, neu co) chi la
 * lop chan phu: no luon lon hon hoac bang gia tri hop dong nen thuong khong kich hoat.
 */
@Component
public class ContractValueLimitValidator {

	/**
	 * @param alreadyInvoiced tong hoa don chua huy da lap cua hop dong (chua gom hoa don moi)
	 * @param newAmount       gia tri hoa don sap lap
	 */
	public void validate(Contract contract, BigDecimal alreadyInvoiced, BigDecimal newAmount) {
		BigDecimal cumulative = alreadyInvoiced.add(newAmount);
		if (cumulative.compareTo(contract.getTotalValue()) > 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Tong hoa don da lap (" + alreadyInvoiced + ") cong hoa don moi (" + newAmount
							+ ") vuot gia tri hop dong (" + contract.getTotalValue()
							+ "). Vui long lap phu luc dieu chinh hop dong truoc (QTN-19)");
		}
		BigDecimal limitValue = contract.getLimitValue();
		if (limitValue != null && cumulative.compareTo(limitValue) > 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Tong hoa don luy ke (" + cumulative + ") vuot han muc tran cua hop dong ("
							+ limitValue + "). Vui long lap phu luc dieu chinh hop dong truoc (QTN-19)");
		}
	}
}
