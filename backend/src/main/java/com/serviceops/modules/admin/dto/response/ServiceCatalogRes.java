package com.serviceops.modules.admin.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Dich vu trong danh muc kem gia dang hieu luc tai ngay {@link #asOf} (QTN-28).
 *
 * @param hasEffectivePrice {@code false} khi chua co moc gia nao hieu luc tai {@code asOf} — dich vu nay
 *                          khong duoc chon khi lap bao gia / hoa don.
 * @param prices            lich su cac moc gia; chi co o API chi tiet, danh sach tra {@code null} (bi luoc).
 */
public record ServiceCatalogRes(
		Long id,
		String code,
		String name,
		String unit,
		String description,
		boolean active,
		LocalDate asOf,
		boolean hasEffectivePrice,
		BigDecimal currentPrice,
		LocalDate currentPriceEffectiveFrom,
		String createdBy,
		LocalDateTime createdAt,
		LocalDateTime updatedAt,
		List<ServicePriceRes> prices
) {}
