package com.serviceops.modules.identity.department.enums;

/**
 * Loai don vi trong cay to chuc. {@code rank} the hien cap bac (so cang nho
 * cang cao): TRUNG_TAM/BAN cung o cap cao nhat (0), PHONG cap 1, TO cap 2.
 * Dung de rang buoc: mot don vi khong the truc thuoc don vi co cap thap hon
 * minh (vi du: Ban khong the la con cua Phong).
 */
public enum DepartmentType {
	TRUNG_TAM("Trung tam", 0),
	BAN("Ban", 0),
	PHONG("Phong", 1),
	TO("To / Nhom", 2);

	private final String label;
	private final int rank;

	DepartmentType(String label, int rank) {
		this.label = label;
		this.rank = rank;
	}

	public String getLabel() {
		return label;
	}

	public int getRank() {
		return rank;
	}
}
