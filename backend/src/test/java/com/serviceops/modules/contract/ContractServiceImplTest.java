package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.ContractCreateFromOpportunityReq;
import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.mapper.ContractMapper;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.impl.ContractServiceImpl;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityAuditAction;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.quotation.entity.Quote;
import com.serviceops.modules.quotation.repository.QuoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test ContractServiceImpl - NCL-04-CN-001 (Tao hop dong tu co hoi da thang):
 * TC-01 luong thanh cong (dung san tu bao gia, lien ket nguoc ve co hoi),
 * TC-02 tu choi co hoi chua thang (QTN-08), TC-04 ghi nhat ky CONTRACT_CREATE,
 * va cac truong hop ngoai le (thieu bao gia, da co hop dong, sai ngay, 404).
 */
@ExtendWith(MockitoExtension.class)
class ContractServiceImplTest {

@Mock
private OpportunityRepository opportunityRepository;

@Mock
private QuoteRepository quoteRepository;

@Mock
private ContractRepository contractRepository;

@Mock
private CustomerRepository customerRepository;

@Mock
private OpportunityAuditLogger auditLogger;

private final ContractMapper contractMapper = new ContractMapper();

private ContractServiceImpl service;

@BeforeEach
void setUp() {
service = new ContractServiceImpl(opportunityRepository, quoteRepository,
contractRepository, customerRepository, contractMapper, auditLogger);
SecurityContextHolder.getContext().setAuthentication(
new TestingAuthenticationToken("sale01", "n/a"));
}

private Opportunity wonOpportunity(long id) {
Opportunity opportunity = new Opportunity();
opportunity.setId(id);
opportunity.setName("Trien khai ERP cho Cong ty TNHH ABC");
opportunity.setCustomerId(1L);
opportunity.setStage(OpportunityStage.WON);
return opportunity;
}

private Quote quote(long id, long opportunityId, String totalAmount) {
Quote quote = new Quote();
quote.setId(id);
quote.setOpportunityId(opportunityId);
quote.setVersion(2);
quote.setTotalAmount(new BigDecimal(totalAmount));
return quote;
}

@Test
@DisplayName("TC-01: tao hop dong thanh cong, dung san tu bao gia va lien ket nguoc ve co hoi")
void createsContractFromWonOpportunity() {
when(opportunityRepository.findById(1L)).thenReturn(Optional.of(wonOpportunity(1L)));
when(contractRepository.existsByOpportunityId(1L)).thenReturn(false);
when(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(1L))
.thenReturn(Optional.of(quote(30L, 1L, "500000000")));
when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));
Customer customer = new Customer();
customer.setName("Cong ty TNHH ABC");
when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));

ContractCreateFromOpportunityReq request = new ContractCreateFromOpportunityReq(
null, ContractType.FIXED_PRICE, null,
LocalDate.of(2026, 10, 1), LocalDate.of(2027, 9, 30), "Tra theo cot moc");
ContractRes res = service.createFromOpportunity(1L, request);

// Du lieu dung san lay tu co hoi + bao gia, khong lay tu request.
assertThat(res.opportunityId()).isEqualTo(1L);
assertThat(res.customerId()).isEqualTo(1L);
assertThat(res.customerName()).isEqualTo("Cong ty TNHH ABC");
assertThat(res.quoteId()).isEqualTo(30L);
assertThat(res.totalValue()).isEqualByComparingTo("500000000");
// Ten hop dong bo trong thi lay ten co hoi; trang thai khoi tao la DRAFT.
assertThat(res.name()).isEqualTo("Trien khai ERP cho Cong ty TNHH ABC");
assertThat(res.status()).isEqualTo(ContractStatus.DRAFT.name());
assertThat(res.contractCode()).startsWith("HD-");
assertThat(res.createdBy()).isEqualTo("sale01");
}

@Test
@DisplayName("TC-01: totalValue nguoi dung nhap thi uu tien hon gia tri bao gia")
void usesUserSuppliedTotalValueWhenProvided() {
when(opportunityRepository.findById(1L)).thenReturn(Optional.of(wonOpportunity(1L)));
when(contractRepository.existsByOpportunityId(1L)).thenReturn(false);
when(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(1L))
.thenReturn(Optional.of(quote(30L, 1L, "500000000")));
when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

ContractCreateFromOpportunityReq request = new ContractCreateFromOpportunityReq(
"Hop dong ERP", ContractType.TIME_AND_MATERIAL, new BigDecimal("480000000"),
null, null, null);
ContractRes res = service.createFromOpportunity(1L, request);

assertThat(res.totalValue()).isEqualByComparingTo("480000000");
assertThat(res.name()).isEqualTo("Hop dong ERP");
}

@Test
@DisplayName("TC-02 (QTN-08): co hoi chua thang (NEGOTIATION) thi tu choi va khong luu")
void rejectsNonWonOpportunity() {
Opportunity negotiating = wonOpportunity(1L);
negotiating.setStage(OpportunityStage.NEGOTIATION);
when(opportunityRepository.findById(1L)).thenReturn(Optional.of(negotiating));

assertThatThrownBy(() -> service.createFromOpportunity(1L, request()))
.isInstanceOf(BusinessRuleException.class)
.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
.isEqualTo(ErrorCode.INVALID_STATE);

verify(contractRepository, never()).save(any());
verify(auditLogger, never()).recordContractCreate(any(), anyString());
}

@Test
@DisplayName("Tu choi khi co hoi da co hop dong (mot co hoi chi mot hop dong)")
void rejectsDuplicateContractForSameOpportunity() {
when(opportunityRepository.findById(1L)).thenReturn(Optional.of(wonOpportunity(1L)));
when(contractRepository.existsByOpportunityId(1L)).thenReturn(true);

assertThatThrownBy(() -> service.createFromOpportunity(1L, request()))
.isInstanceOf(BusinessRuleException.class)
.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
.isEqualTo(ErrorCode.INVALID_STATE);

verify(contractRepository, never()).save(any());
}

@Test
@DisplayName("Tu choi khi co hoi thang chua co bao gia de dung san")
void rejectsWhenOpportunityHasNoQuote() {
when(opportunityRepository.findById(1L)).thenReturn(Optional.of(wonOpportunity(1L)));
when(contractRepository.existsByOpportunityId(1L)).thenReturn(false);
when(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(1L)).thenReturn(Optional.empty());

assertThatThrownBy(() -> service.createFromOpportunity(1L, request()))
.isInstanceOf(BusinessRuleException.class)
.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
.isEqualTo(ErrorCode.VALIDATION_ERROR);

verify(contractRepository, never()).save(any());
}

@Test
@DisplayName("Tu choi khi ngay ket thuc som hon ngay bat dau")
void rejectsEndDateBeforeStartDate() {
when(opportunityRepository.findById(1L)).thenReturn(Optional.of(wonOpportunity(1L)));
when(contractRepository.existsByOpportunityId(1L)).thenReturn(false);
when(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(1L))
.thenReturn(Optional.of(quote(30L, 1L, "500000000")));

ContractCreateFromOpportunityReq request = new ContractCreateFromOpportunityReq(
null, ContractType.FIXED_PRICE, null,
LocalDate.of(2027, 9, 30), LocalDate.of(2026, 10, 1), null);

assertThatThrownBy(() -> service.createFromOpportunity(1L, request))
.isInstanceOf(BusinessRuleException.class)
.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
.isEqualTo(ErrorCode.INVALID_STATE);

verify(contractRepository, never()).save(any());
}

@Test
@DisplayName("Bao RESOURCE_NOT_FOUND khi co hoi khong ton tai")
void rejectsWhenOpportunityMissing() {
when(opportunityRepository.findById(99L)).thenReturn(Optional.empty());

assertThatThrownBy(() -> service.createFromOpportunity(99L, request()))
.isInstanceOf(BusinessRuleException.class)
.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
}

@Test
@DisplayName("TC-04: tao thanh cong thi ghi nhat ky CONTRACT_CREATE kem nguoi thuc hien va ma hop dong")
void recordsContractCreateAuditLog() {
when(opportunityRepository.findById(1L)).thenReturn(Optional.of(wonOpportunity(1L)));
when(contractRepository.existsByOpportunityId(1L)).thenReturn(false);
when(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(1L))
.thenReturn(Optional.of(quote(30L, 1L, "500000000")));
when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));
when(customerRepository.findById(1L)).thenReturn(Optional.empty());

service.createFromOpportunity(1L, request());

ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
verify(auditLogger).recordContractCreate(eq(1L), detailCaptor.capture());
assertThat(detailCaptor.getValue()).contains("HD-").contains("tu co hoi id=1").contains("bao gia id=30");
}

private ContractCreateFromOpportunityReq request() {
return new ContractCreateFromOpportunityReq(
null, ContractType.FIXED_PRICE, null, null, null, null);
}
}