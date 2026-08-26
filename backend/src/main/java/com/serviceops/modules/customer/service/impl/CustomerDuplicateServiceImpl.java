package com.serviceops.modules.customer.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerDuplicateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * NCL-02-CN-002: thuat toan chong trung ho so khach hang.
 */
@Service
@RequiredArgsConstructor
public class CustomerDuplicateServiceImpl implements CustomerDuplicateService {

    private static final double MIN_SIMILARITY = 0.6;
    private static final double BLOCKING_SIMILARITY = 0.9;
    private static final double TAX_CODE_WEIGHT = 0.95;
    private static final double PHONE_WEIGHT = 0.85;
    private static final double NAME_MATCH_FIELD = 0.7;

    private final CustomerRepository customerRepository;

    @Override
    public List<DuplicateCandidateRes> findDuplicates(String name, String taxCode, String phone) {
        String normalizedName = normalizeName(name);
        String normalizedTax = normalizeTaxCode(taxCode);
        String normalizedPhone = normalizePhone(phone);
        if (isEmpty(normalizedName) || normalizedName.length() < 3) {
            return List.of();
        }

        List<Customer> candidates = collectCandidates(normalizedName, normalizedTax);

        Map<Long, DuplicateCandidateRes> result = new LinkedHashMap<>();
        for (Customer c : candidates) {
            double score = Math.min(1.0, similarity(c, normalizedName, normalizedTax, normalizedPhone));
            if (score < MIN_SIMILARITY) {
                continue;
            }
            DuplicateCandidateRes existing = result.get(c.getId());
            if (existing == null || existing.similarity() < score) {
                result.put(c.getId(), new DuplicateCandidateRes(
                        c.getId(), c.getCode(), c.getName(), c.getTaxCode(), c.getPhone(),
                        score, matchedFields(c, normalizedName, normalizedTax, normalizedPhone)));
            }
        }
        return result.values().stream()
                .sorted((a, b) -> Double.compare(b.similarity(), a.similarity()))
                .toList();
    }

    @Override
    public void assertNoBlockingDuplicate(List<DuplicateCandidateRes> candidates) {
        boolean blocking = candidates.stream()
                .anyMatch(c -> c.similarity() >= BLOCKING_SIMILARITY);
        if (blocking) {
            throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
                    "Ho so khach hang co the trung voi ho so da co (muc do giong cao). "
                            + "Vui long kiem tra va xac nhan tao moi kem ly do (TC-02).");
        }
    }

    private List<Customer> collectCandidates(String normalizedName, String normalizedTax) {
        Map<Long, Customer> map = new LinkedHashMap<>();
        for (Customer c : customerRepository.findByNameContainingIgnoreCase(normalizedName)) {
            map.put(c.getId(), c);
        }
        if (!isEmpty(normalizedTax)) {
            customerRepository.findByTaxCode(normalizedTax).ifPresent(c -> map.put(c.getId(), c));
        }
        return new ArrayList<>(map.values());
    }

    private double similarity(Customer c, String normalizedName, String normalizedTax, String normalizedPhone) {
        double score = nameSimilarity(c.getName(), normalizedName);
        String cTax = normalizeTaxCode(c.getTaxCode());
        String cPhone = normalizePhone(c.getPhone());
        if (!isEmpty(normalizedTax) && normalizedTax.equals(cTax)) {
            score = Math.max(score, TAX_CODE_WEIGHT);
        }
        if (!isEmpty(normalizedPhone) && !isEmpty(cPhone) && normalizedPhone.equals(cPhone)) {
            score = Math.max(score, PHONE_WEIGHT);
        }
        return score;
    }

    private List<String> matchedFields(Customer c, String normalizedName, String normalizedTax, String normalizedPhone) {
        List<String> fields = new ArrayList<>();
        if (nameSimilarity(c.getName(), normalizedName) >= NAME_MATCH_FIELD) {
            fields.add("ten");
        }
        String cTax = normalizeTaxCode(c.getTaxCode());
        if (!isEmpty(normalizedTax) && normalizedTax.equals(cTax)) {
            fields.add("maSoThue");
        }
        String cPhone = normalizePhone(c.getPhone());
        if (!isEmpty(normalizedPhone) && !isEmpty(cPhone) && normalizedPhone.equals(cPhone)) {
            fields.add("soDienThoai");
        }
        return fields;
    }

    private double nameSimilarity(String a, String b) {
        String na = normalizeName(a);
        if (isEmpty(na) || isEmpty(b)) {
            return 0.0;
        }
        int distance = levenshtein(na, b);
        int maxLen = Math.max(na.length(), b.length());
        return maxLen == 0 ? 0.0 : 1.0 - ((double) distance / maxLen);
    }

    private int levenshtein(String a, String b) {
        int[] prev = new int[b.length() + 1];
        int[] cur = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            prev[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            cur[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                cur[j] = Math.min(Math.min(prev[j] + 1, cur[j - 1] + 1), prev[j - 1] + cost);
            }
            int[] tmp = prev;
            prev = cur;
            cur = tmp;
        }
        return prev[b.length()];
    }

    private String normalizeName(String value) {
        if (value == null) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String normalizeTaxCode(String value) {
        if (value == null) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT).replaceAll("[\\s-]", "");
    }

    private String normalizePhone(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+84")) {
            cleaned = "0" + cleaned.substring(3);
        } else if (cleaned.startsWith("84") && cleaned.length() >= 10) {
            cleaned = "0" + cleaned.substring(2);
        }
        return cleaned;
    }

    private boolean isEmpty(String value) {
        return value == null || value.isBlank();
    }
}
