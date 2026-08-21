package com.serviceops.common.masking;

public interface DataMaskingService {
	boolean canViewSensitiveData();

	Object mask(Object value);
}
