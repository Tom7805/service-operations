package com.serviceops.modules.identity.auth.service;

import com.serviceops.modules.identity.auth.dto.request.LoginReq;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;

public interface AuthService {

    LoginRes login(LoginReq request, String ipAddress);
}
