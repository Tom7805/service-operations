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
     * READY_TO_INVOICE -&gt; INVOICED (NCL-04-CN-003). Buoc sang INVOICED chi duoc
     * {@code MilestoneInvoiceService} (NCL-10-CN-002) goi khi lap hoa don — API cong khai
     * chan dat tay INVOICED. Day cung la du lieu ma NCL-04-CN-005 dua vao de tinh muc do
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
     *         chuyen trang thai khong hop le (nhay coc, lui lai, hoac giu nguyen); INVALID_STATE
     *         neu mo moc (READY_TO_INVOICE) trong khi phieu nghiem thu gan voi moc chua duoc khach
     *         hang xac nhan (NCL-12-CN-003, QTN-25)
     */
    ContractMilestoneRes updateStatus(Long contractId, Long milestoneId, ContractMilestoneStatus newStatus);

    /**
     * Dua moc READY_TO_INVOICE ve lai PENDING vi phieu nghiem thu gan voi moc chua duoc xac nhan hoac
     * vua bi go khoi moc (NCL-12-CN-003, QTN-25: "giu moc o trang thai cho nghiem thu"). Moc dang
     * PENDING thi khong lam gi; moc INVOICED thi bao loi vi hoa don da phat hanh.
     *
     * @throws com.serviceops.common.exception.BusinessRuleException RESOURCE_NOT_FOUND neu khong co
     *         moc thuoc hop dong; INVALID_STATE neu moc da INVOICED
     */
    ContractMilestoneRes holdForAcceptance(Long contractId, Long milestoneId, String reason);
}