package com.serviceops.modules.contract.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Hop dong tra ve cho FE sau khi tao tu co hoi da thang (NCL-04-CN-001).
 *
 * @param opportunityId Lien ket nguoc ve co hoi goc - ket qua bat buoc cua story.
 * @param customerName  Ten khach hang hien thi (join tu customers o tang service).
 * @param status        Trang thai hop dong; hop dong moi luon la DRAFT.
 */
public record ContractRes(
Long id,
String contractCode,
String name,
Long opportunityId,
Long customerId,
String customerName,
Long quoteId,
String contractType,
BigDecimal totalValue,
LocalDate startDate,
LocalDate endDate,
String status,
String notes,
String createdBy,
LocalDateTime createdAt
) {}