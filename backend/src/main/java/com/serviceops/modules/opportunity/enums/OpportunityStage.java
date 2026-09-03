package com.serviceops.modules.opportunity.enums;

/**
 * Giai doan cua co hoi ban hang, duoc chuyen theo thu tu (QTN-06).
 * Gia tri dau tien ({@link #APPROACH}) la giai doan mac dinh khi tao co hoi moi
 * (NCL-03-CN-001, TC-01) — co hoi duoc tao o "giai doan tiep can".
 */
public enum OpportunityStage {
    /** Giai doan dau tien — tiep can khach hang. */
    APPROACH,

    /** De xuat / bao gia cho khach hang. */
    PROPOSAL,

    /** Dang thuong luong dieu khoan. */
    NEGOTIATION,

    /** Da ky hop dong / chot duoc co hoi. */
    WON,

    /** Khong chot duoc co hoi. */
    LOST
}
