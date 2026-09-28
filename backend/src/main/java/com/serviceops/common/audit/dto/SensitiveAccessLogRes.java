package com.serviceops.common.audit.dto;
import com.serviceops.common.audit.enums.AccessAction;
import com.serviceops.common.audit.enums.SensitiveDataType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SensitiveAccessLogRes {

    private Long id;

    private Long userId;

    private String username;

    private AccessAction action;

    private SensitiveDataType dataType;

    private Long targetId;

    private String targetRef;

    private String ipAddress;

    private String detail;

    private LocalDateTime accessedAt;
}
