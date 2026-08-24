package com.serviceops.security.scope;

import java.util.Set;

/**
 * Pham vi du lieu hieu luc cua mot tai khoan, duoc tinh lai moi request (khong cache trong JWT)
 * de dam bao QTN-01-TC-03: thay doi vai tro/pham vi ap dung ngay lan thao tac ke tiep.
 *
 * @param type          loai pham vi
 * @param departmentIds voi type = DEPARTMENT: id cua bo phan duoc gan cung toan bo bo phan con chau.
 *                       Rong voi COMPANY (khong gioi han) va SELF (khong xet theo bo phan).
 */
public record UserScope(DataScopeType type, Set<Long> departmentIds) {

    public static UserScope company() {
        return new UserScope(DataScopeType.COMPANY, Set.of());
    }

    public boolean isCompanyWide() {
        return type == DataScopeType.COMPANY;
    }

    public boolean allowsDepartment(Long departmentId) {
        if (type == DataScopeType.COMPANY) {
            return true;
        }
        if (type == DataScopeType.DEPARTMENT) {
            return departmentId != null && departmentIds.contains(departmentId);
        }
        return false;
    }
}
