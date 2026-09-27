package com.serviceops.modules.admin.service;

import com.serviceops.modules.admin.dto.request.ServiceCatalogReq;
import com.serviceops.modules.admin.dto.request.ServiceCatalogStatusReq;
import com.serviceops.modules.admin.dto.request.ServiceCatalogUpdateReq;
import com.serviceops.modules.admin.dto.request.ServicePriceReq;
import com.serviceops.modules.admin.dto.response.EffectivePriceRes;
import com.serviceops.modules.admin.dto.response.ServiceCatalogRes;

import java.time.LocalDate;
import java.util.List;

/**
 * NCL-15-CN-001: danh muc dich vu va gia dung chung cho bao gia va hoa don (QTN-28).
 */
public interface ServiceCatalogService {

	/** Danh sach dich vu kem gia hieu luc tai {@code asOf} (mac dinh hom nay). */
	List<ServiceCatalogRes> search(String keyword, Boolean active, LocalDate asOf);

	/** Chi tiet dich vu kem lich su moc gia. */
	ServiceCatalogRes get(Long id, LocalDate asOf);

	/** TC-01 / TC-02: tao dich vu moi kem moc gia dau tien; trung ten thi {@code DUPLICATE_DATA}. */
	ServiceCatalogRes create(ServiceCatalogReq request);

	ServiceCatalogRes update(Long id, ServiceCatalogUpdateReq request);

	ServiceCatalogRes updateStatus(Long id, ServiceCatalogStatusReq request);

	/** Them moc gia moi — khong ghi de moc cu (QTN-28). */
	ServiceCatalogRes addPrice(Long id, ServicePriceReq request);

	/**
	 * Dich vu duoc phep chon khi lap bao gia / hoa don tai ngay {@code date}: dang hoat dong VA co gia hieu luc.
	 * Dich vu thieu gia hieu luc bi loai (QTN-28 — "khong cho chon dich vu do").
	 */
	List<ServiceCatalogRes> listSelectable(LocalDate date);

	/**
	 * QTN-28: gia cua bang gia dang hieu luc tai ngay lap. Dung cho cac module bao gia / hoa don.
	 * Thieu gia hieu luc hoac dich vu da ngung thi {@code INVALID_STATE}.
	 */
	EffectivePriceRes resolveEffectivePrice(Long id, LocalDate date);
}
