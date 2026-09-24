package com.serviceops.modules.acceptance.dto.request;

import jakarta.validation.constraints.NotNull;

/** NCL-12-CN-003: gan phieu nghiem thu vao mot moc thanh toan cua hop dong cua du an. */
public record AcceptanceMilestoneLinkReq(
		@NotNull(message = "Moc thanh toan khong duoc de trong") Long contractMilestoneId) {
}
