package com.serviceops.modules.project.enums;

/**
 * NCL-05-CN-008: trang thai tien do cua moc, tinh DONG khi doc du lieu (khong luu DB):
 * DONE khi da co ngay thuc te; LATE khi da qua ngay ke hoach ma chua hoan thanh;
 * con lai ON_TRACK.
 */
public enum MilestoneProgressStatus {
	DONE,
	ON_TRACK,
	LATE
}
