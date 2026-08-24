package com.serviceops.common.masking;

public enum MaskingLevel {
	SALARY("Luong / chi phi gio cong noi bo"),
	COST("Gia von");

	private final String label;

	MaskingLevel(String label) {
		this.label = label;
	}

	public String getLabel() {
		return label;
	}
}
