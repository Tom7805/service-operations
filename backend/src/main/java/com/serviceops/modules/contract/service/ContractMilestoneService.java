package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.request.ContractMilestoneReq;
import com.serviceops.modules.contract.dto.response.ContractMilestoneRes;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;

import java.util.List;

public interface ContractMilestoneService {

    List<ContractMilestoneRes> list(Long contractId);

    List<ContractMilestoneRes> replace(Long contractId, List<ContractMilestoneReq> requests);

    /**
     * Doi trang thai mot moc thanh toan theo dung trinh tu PENDING -&gt;
     * READY_TO_INVOICE -&gt; INVOICED (NCL-04-CN-003), dung de danh dau moc
     * da duoc xuat hoa don khi he thong chua co module hoa don rieng (Epic
     * NCL-10) — day cung la du lieu ma NCL-04-CN-005 dua vao de tinh muc do
     * da su dung han muc tran cua hop dong.
     *
     * @param contractId  hop dong so huu moc thanh toan
     * @param milestoneId moc thanh toan can doi trang thai
     * @param newStatus   trang thai dich, phai o ngay sau trang thai hien tai
     *                    theo trinh tu tren (khong cho nhay coc hay lui lai)
     * @return moc thanh toan sau khi cap nhat
     * @throws com.serviceops.common.exception.BusinessRuleException
     *         RESOURCE_NOT_FOUND neu khong ton tai hop dong/moc thanh toan,
     *         hoac moc thanh toan khong thuoc hop dong nay; INVALID_STATE neu
     *         chuyen trang thai khong hop le (nhay coc, lui lai, hoac giu nguyen)
     */
    ContractMilestoneRes updateStatus(Long contractId, Long milestoneId, ContractMilestoneStatus newStatus);
}