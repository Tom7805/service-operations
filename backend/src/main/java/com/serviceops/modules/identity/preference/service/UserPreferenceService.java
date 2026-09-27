package com.serviceops.modules.identity.preference.service;

import com.serviceops.modules.identity.preference.dto.request.UserPreferenceReq;
import com.serviceops.modules.identity.preference.dto.response.UserPreferenceRes;

public interface UserPreferenceService {

	/** Tuy chon cua nguoi dung; chua luu lan nao thi tra mac dinh. */
	UserPreferenceRes get(Long userId);

	/** Tao moi hoac ghi de tuy chon cua nguoi dung. */
	UserPreferenceRes update(Long userId, UserPreferenceReq request);
}
