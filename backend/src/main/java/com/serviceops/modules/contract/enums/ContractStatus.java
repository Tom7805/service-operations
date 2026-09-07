package com.serviceops.modules.contract.enums;

/**
 * Trang thai hop dong (NCL-04). Moi hop dong tao tu co hoi da thang
 * (NCL-04-CN-001) khoi tao o trang thai DRAFT - hop dong "dung san"
 * cho nguoi dung bo sung thong tin. Cac trang thai khac phuc vu vong doi
 * hop dong va se duoc cac story sau (VHDV-41..46) su dung.
 */
public enum ContractStatus {

/** Hop dong dung san, chua duoc bo sung/kich hoat. Trang thai khoi tao. */
DRAFT,

/** Hop dong dang hieu luc. */
ACTIVE,

/** Hop dong da hoan thanh dung han. */
COMPLETED,

/** Hop dong da cham dut truoc han. */
TERMINATED
}
