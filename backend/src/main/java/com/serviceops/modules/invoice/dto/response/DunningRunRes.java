package com.serviceops.modules.invoice.dto.response;

import java.time.LocalDate;
import java.util.List;

/** NCL-10-CN-006: kết quả một lần rà soát nhắc thu nợ. */
public record DunningRunRes(LocalDate asOf, List<DunningLogRes> sent, int skippedAlreadySentCount) {
}
