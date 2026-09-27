package com.serviceops.modules.opportunity.enums;

/**
 * Giai doan cua co hoi ban hang, duoc chuyen theo thu tu (QTN-06):
 * tiep can -> khao sat -> bao gia -> dam phan -> ket qua thang hoac thua
 * (NCL-03-CN-002). Gia tri dau tien ({@link #APPROACH}) la giai doan mac dinh khi
 * tao co hoi moi (NCL-03-CN-001, TC-01). Thu tu khai bao o day chinh la thu tu
 * hien thi tren bao cao duong ong (NCL-03-CN-007) nen khong duoc dao lon.
 */
public enum OpportunityStage {
    /** Giai doan dau tien — tiep can khach hang. */
    APPROACH,

    /** Khao sat nhu cau, hien trang cua khach hang. */
    SURVEY,

    /** Bao gia cho khach hang (dieu kien de lap bao gia — NCL-03-CN-003). */
    PROPOSAL,

    /** Dang dam phan dieu khoan. */
    NEGOTIATION,

    /** Da ky hop dong / chot duoc co hoi. */
    WON,

    /** Khong chot duoc co hoi. */
    LOST
}
