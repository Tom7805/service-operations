package com.serviceops.security.scope;

public enum DataScopeType {
    COMPANY,
    DEPARTMENT,
    SELF;

    public static DataScopeType fromCode(String code) {
        if (code == null || code.isBlank()) {
            return COMPANY;
        }
        try {
            return DataScopeType.valueOf(code.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
