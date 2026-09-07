package com.serviceops.modules.contract.enums;

/**
 * Loai hop dong dich vu (NCL-04). Gia tri de nghi dung san theo bao gia cua
 * co hoi, nguoi dung co the chinh sua khi bo sung hop dong (NCL-04-CN-001).
 */
public enum ContractType {

/** Tra theo thoi gian - nhan luc dua tren don gia ngay (bill rate). */
TIME_AND_MATERIAL,

/** Tra theo goi dinh muc cho pham vi da chot. */
FIXED_PRICE,

/** Tra phi dinh ky bao tri/ho tro theo chu ky. */
MAINTENANCE
}
