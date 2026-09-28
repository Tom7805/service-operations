package com.serviceops.modules.invoice.dto.response;

/**
 * So dong gio cong trong ky bi bo qua khi tao de nghi (QTN-18) — nhu vay ke toan biet vi sao so dong trong de nghi
 * it hon so dong ghi trong ky.
 *
 * @param notApprovedCount     dong chua duoc duyet (nhap, cho duyet hoac bi tu choi)
 * @param nonBillableCount     dong da duyet nhung khong tinh phi
 * @param alreadyProposedCount dong da nam trong mot de nghi xuat hoa don truoc do
 * @param missingRateCount     dong da duyet, co tinh phi nhung chua tra duoc don gia ban (chua khai bao cap bac,
 *                             chua co don gia hieu luc...) — khong duoc tinh vao tong
 */
public record InvoiceProposalSkippedRes(
		int notApprovedCount,
		int nonBillableCount,
		int alreadyProposedCount,
		int missingRateCount
) {

	public int total() {
		return notApprovedCount + nonBillableCount + alreadyProposedCount + missingRateCount;
	}
}
