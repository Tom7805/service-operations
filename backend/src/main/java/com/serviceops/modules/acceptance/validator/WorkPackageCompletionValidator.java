package com.serviceops.modules.acceptance.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.TaskStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * QTN-24: chi lap phieu nghiem thu khi toan bo cong viec cua hang muc — ke ca cong viec cua cac hang
 * muc con (cay hang muc nhieu cap, NCL-05-CN-002) — da o trang thai DONE.
 */
@Component
public class WorkPackageCompletionValidator {

	/** Id cua hang muc goc va moi hang muc con chau cua no. */
	public Set<Long> subtreeIds(Long rootId, List<WorkPackage> projectPackages) {
		Map<Long, List<Long>> childrenByParent = new HashMap<>();
		for (WorkPackage pack : projectPackages) {
			if (pack.getParentId() != null) {
				childrenByParent.computeIfAbsent(pack.getParentId(), key -> new ArrayList<>())
						.add(pack.getId());
			}
		}
		Set<Long> result = new LinkedHashSet<>();
		Deque<Long> queue = new ArrayDeque<>();
		queue.add(rootId);
		while (!queue.isEmpty()) {
			Long current = queue.poll();
			if (result.add(current)) {
				queue.addAll(childrenByParent.getOrDefault(current, List.of()));
			}
		}
		return result;
	}

	/** Id cua cac hang muc to tien (cha, ong...) cua mot hang muc. */
	public Set<Long> ancestorIds(WorkPackage workPackage, List<WorkPackage> projectPackages) {
		Map<Long, Long> parentById = new HashMap<>();
		for (WorkPackage pack : projectPackages) {
			parentById.put(pack.getId(), pack.getParentId());
		}
		Set<Long> result = new LinkedHashSet<>();
		Long parentId = workPackage.getParentId();
		while (parentId != null && result.add(parentId)) {
			parentId = parentById.get(parentId);
		}
		return result;
	}

	public List<Task> unfinished(List<Task> tasks) {
		return tasks.stream().filter(task -> task.getStatus() != TaskStatus.DONE).toList();
	}

	/**
	 * @throws BusinessRuleException INVALID_STATE neu hang muc khong co cong viec nao, hoac con cong
	 *         viec chua hoan thanh — thong diep liet ke cac cong viec con dang do (TC-02)
	 */
	public void validate(WorkPackage workPackage, List<Task> tasks) {
		if (tasks.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Hang muc \"" + workPackage.getName() + "\" chua co cong viec nao, khong the lap phieu nghiem thu");
		}
		List<Task> unfinished = unfinished(tasks);
		if (!unfinished.isEmpty()) {
			String detail = unfinished.stream()
					.map(task -> "#" + task.getId() + " " + task.getName() + " (" + task.getStatus() + ")")
					.collect(Collectors.joining("; "));
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Hang muc \"" + workPackage.getName() + "\" con " + unfinished.size()
							+ " cong viec chua hoan thanh, chua the lap phieu nghiem thu (QTN-24): " + detail);
		}
	}
}
