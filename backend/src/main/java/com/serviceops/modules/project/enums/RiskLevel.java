package com.serviceops.modules.project.enums;

/**
 * NCL-05-CN-009: thang ba muc dung cho ca <b>muc tac dong</b> (impact) va
 * <b>kha nang xay ra</b> (likelihood) cua rui ro, dong thoi la ket qua muc do rui ro
 * (severity) tinh DONG tu ma tran impact x likelihood — khong luu DB.
 *
 * <p>Trong so 1..3 dung de nhan ra diem rui ro (score = impact.weight * likelihood.weight, 1..9):
 * score &ge; 6 -&gt; HIGH; score &ge; 3 -&gt; MEDIUM; con lai LOW.</p>
 */
public enum RiskLevel {
	LOW(1),
	MEDIUM(2),
	HIGH(3);

	private final int weight;

	RiskLevel(int weight) {
		this.weight = weight;
	}

	public int weight() {
		return weight;
	}

	/** Muc do rui ro suy ra tu diem rui ro (impact.weight * likelihood.weight). */
	public static RiskLevel fromScore(int score) {
		if (score >= 6) {
			return HIGH;
		}
		if (score >= 3) {
			return MEDIUM;
		}
		return LOW;
	}
}
