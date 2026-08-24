package com.serviceops.common.audit;

import com.serviceops.common.audit.entity.SensitiveDataAccessLog;
import com.serviceops.common.audit.enums.AccessAction;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.repository.SensitiveDataAccessLogRepository;
import com.serviceops.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Ghi nhật ký truy cập dữ liệu nhạy cảm (NCL-01-CN-006, QTN-03).
 *
 * <p>Mọi lần <b>xem</b> hoặc <b>xuất</b> dữ liệu nhạy cảm (lương, giá vốn, biên lợi nhuận)
 * đều phải ghi nhật ký — ghi nhận <b>người dùng</b>, <b>đối tượng dữ liệu</b> và <b>thời điểm</b>.</p>
 *
 * <p><b>Fails-fast (QTN-03):</b> nếu không ghi được nhật ký thì thao tác không được hoàn tất.
 * Các phương thức ghi log dùng {@code REQUIRED} (cùng transaction thao tác), do đó khi ghi log
 * thất bại sẽ ném ngoại lệ làm rollback toàn bộ thao tác gọi tới.</p>
 */
@Service
@RequiredArgsConstructor
public class SensitiveAccessLogger {

    private final SensitiveDataAccessLogRepository repository;

    /**
     * Ghi nhật ký một lượt <b>xem</b> dữ liệu nhạy cảm.
     */
    @Transactional
    public SensitiveDataAccessLog logView(SensitiveDataType dataType,
                                          Long targetId,
                                          String targetRef,
                                          String detail) {
        return write(AccessAction.VIEW, dataType, targetId, targetRef, detail);
    }

    /**
     * Ghi nhật ký một lượt <b>xuất (export)</b> dữ liệu nhạy cảm.
     */
    @Transactional
    public SensitiveDataAccessLog logExport(SensitiveDataType dataType,
                                            Long targetId,
                                            String targetRef,
                                            String detail) {
        return write(AccessAction.EXPORT, dataType, targetId, targetRef, detail);
    }

    /**
     * Ghi nhật ký một lượt <b>truy cập bị từ chối</b> do không đủ quyền (QTN-01 / QTN-03, TC-03).
     *
     * <p>Khác với {@link #logView}/{@link #logExport}, lần từ chối thường diễn ra khi chưa xác định
     * được người dùng (hoặc thao tác sẽ không được phép hoàn tất), nên dùng {@code REQUIRES_NEW}
     * để nhật ký lần từ chối luôn được lưu độc lập, không bị rollback theo thao tác bị chặn.</p>
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SensitiveDataAccessLog logDenied(SensitiveDataType dataType,
                                            Long targetId,
                                            String targetRef,
                                            String ipAddress,
                                            String detail) {
        SensitiveDataAccessLog log = baseLog(AccessAction.DENIED, dataType, targetId, targetRef, detail);
        log.setIpAddress(ipAddress);
        return save(log);
    }

    /** Nhận diện và lưu một bản ghi nhật ký từ ngữ cảnh bảo mật hiện tại. */
    private SensitiveDataAccessLog write(AccessAction action,
                                         SensitiveDataType dataType,
                                         Long targetId,
                                         String targetRef,
                                         String detail) {
        SensitiveDataAccessLog log = baseLog(action, dataType, targetId, targetRef, detail);
        return save(log);
    }

    /** Dựng bản ghi nhật ký từ người dùng đang đăng nhập (SecurityContext) + thông tin truy cập. */
    private SensitiveDataAccessLog baseLog(AccessAction action,
                                           SensitiveDataType dataType,
                                           Long targetId,
                                           String targetRef,
                                           String detail) {
        SensitiveDataAccessLog log = new SensitiveDataAccessLog();
        log.setAction(action);
        log.setDataType(dataType);
        log.setTargetId(targetId);
        log.setTargetRef(targetRef);
        log.setDetail(detail);
        log.setAccessedAt(LocalDateTime.now());

        currentUser().ifPresent(user -> {
            log.setUserId(user.getId());
            log.setUsername(user.getUsername());
        });

        return log;
    }

    /**
     * Lưu bản ghi nhật ký. Nếu ghi thất bại, ngoại lệ {@link RuntimeException} sẽ lan truyền:
     * <ul>
     *   <li>kích hoạt <b>rollback</b> transaction thao tác (QTN-03: không ghi được → không hoàn tất);</li>
     *   <li>được {@code GlobalExceptionHandler} xử lý thành {@code 500 INTERNAL_ERROR}.</li>
     * </ul>
     */
    private SensitiveDataAccessLog save(SensitiveDataAccessLog log) {
        return repository.save(log);
    }

    /** Lấy người dùng hiện tại từ {@link SecurityContextHolder}; rỗng nếu chưa xác thực. */
    private Optional<CustomUserDetails> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails user)) {
            return Optional.empty();
        }
        return Optional.of(user);
    }
}

