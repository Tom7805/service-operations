package com.serviceops.common.audit.dto;
import com.serviceops.common.audit.enums.SensitiveDataType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;


@Getter
@Setter
public class SensitiveAccessLogSearchReq {

    private Long userId;

    private String username;

    private SensitiveDataType dataType;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime from;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime to;

    @Min(0)
    private int page = 0;

    @Min(1)
    @Max(200)
    private int size = 20;
}
