package com.serviceops.common.masking;

public enum MaskingLevel {
	SALARY("Lương / chi phí giờ công nội bộ"),
	COST("Giá vốn");

	private final String label;

	MaskingLevel(String label) {
		this.label = label;
	}

	public String getLabel() {
		return label;
	}
}
