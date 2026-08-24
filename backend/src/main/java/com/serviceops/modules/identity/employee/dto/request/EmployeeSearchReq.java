package com.serviceops.modules.identity.employee.dto.request;

import lombok.Getter;
import lombok.Setter;

/** Bo loc tim kiem ho so nhan su (khong bat buoc). */
@Getter
@Setter
public class EmployeeSearchReq {

    /** Tim theo ten tai khoan hoac ho ten (tim chua, khong phan biet hoa thuong). */
    private String keyword;

    /** Loc theo bo phan. */
    private Long departmentId;
}
