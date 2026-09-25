package com.serviceops.modules.contract.dto.response;

/**
 * The thong ke cua man "Hop dong", tinh tren TOAN BO hop dong (khong phu thuoc bo loc/trang):
 * tong so, dang hieu luc, ban nhap va chua khai bao han muc.
 */
public record ContractPageSummaryRes(long total, long active, long draft, long noLimit) {
}
