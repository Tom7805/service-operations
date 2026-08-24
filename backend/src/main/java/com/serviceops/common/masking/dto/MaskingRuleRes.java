package com.serviceops.common.masking.dto;

import com.serviceops.common.masking.MaskingLevel;

import java.util.Set;

/** Quy tac che du lieu dang hieu luc cho mot MaskingLevel (QTN-02). */
public record MaskingRuleRes(MaskingLevel level, String levelLabel, Set<String> allowedRoles) {
}
