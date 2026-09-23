package com.serviceops.common.audit.dto;
import com.serviceops.common.audit.enums.AccessAction;
import com.serviceops.common.audit.enums.SensitiveDataType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SensitiveAccessLogPage {

    private List<SensitiveAccessLogRes> content;

    private int page;

    private int size;

    private long totalElements;

    private int totalPages;
}
