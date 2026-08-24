package com.serviceops.common.masking;

import java.util.Set;

public interface DataMaskingService {
	boolean canViewSensitiveData();

	Object mask(Object value);

	/** Danh sach ma vai tro duoc phep xem du lieu luong/gia von (QTN-02). */
	Set<String> allowedRoles();
}
