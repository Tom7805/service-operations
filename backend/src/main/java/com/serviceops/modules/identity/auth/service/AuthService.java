package com.serviceops.modules.identity.auth.service;

import com.serviceops.modules.identity.auth.dto.request.LoginReq;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;

/**
 * Đăng nhập hệ thống. Đây là bản tối thiểu (không khóa tài khoản sau nhiều
 * lần sai, không lưu chi tiết phiên) chỉ đủ để cấp JWT phục vụ luồng đổi mật
 * khẩu — phần đầy đủ của NCL-01-CN-001 (khóa tạm sau 5 lần sai, nhật ký đăng
 * nhập chi tiết) do người phụ trách story đó hoàn thiện thêm.
 */
public interface AuthService {

    LoginRes login(LoginReq request, String ipAddress);
}
