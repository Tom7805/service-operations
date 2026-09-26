package com.serviceops.modules.project.scheduler;

import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.TaskBudgetAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Tac vu nen ra soat vuot ngan sach gio cong (QTN-20), di qua co che chong gui trung theo dot
 * canh bao (NCL-14-CN-003, QTN-27):
 * <ul>
 *   <li>TC-01: chay lai moi gio ma cong viec van vuot nguong -> KHONG gui lai cho cung PM.</li>
 *   <li>TC-02: cong viec thoat nguong (vd PM tang ngan sach) roi vuot lai -> dot moi, gui lai.</li>
 * </ul>
 * Luong duyet bang cham cong da canh bao ngay khi duyet; tac vu nay bat nhung thay doi con lai
 * (doi ngan sach, but toan dao) va dong vai tro thu lai neu lan gui luc duyet bi loi.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TaskBudgetAlertScheduler {

	private final TaskRepository taskRepository;
	private final TaskBudgetAlertService taskBudgetAlertService;

	@Scheduled(cron = "0 5 * * * *")
	@Transactional
	public void scanTaskBudgets() {
		List<Task> tasks = taskRepository.findBudgetedTasksOfProjectsInStatus(ProjectStatus.RUNNING);
		int sent = 0;
		for (Task task : tasks) {
			sent += taskBudgetAlertService.evaluate(task).size();
		}
		if (sent > 0) {
			log.info("Ra soat ngan sach gio cong: da gui {} canh bao vuot ngan sach", sent);
		}
	}
}
