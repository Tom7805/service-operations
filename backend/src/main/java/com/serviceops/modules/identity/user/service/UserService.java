package com.serviceops.modules.identity.user.service;

import com.serviceops.modules.identity.user.dto.request.CreateUserReq;
import com.serviceops.modules.identity.user.dto.request.UpdateUserReq;
import com.serviceops.modules.identity.user.dto.request.UserStatusReq;
import com.serviceops.modules.identity.user.dto.response.UserRes;

import java.util.List;

public interface UserService {
    List<UserRes> findAll(String keyword);
    UserRes findById(Long id);
    UserRes create(CreateUserReq request);
    UserRes update(Long id, UpdateUserReq request);
    UserRes updateStatus(Long id, UserStatusReq request);
}
