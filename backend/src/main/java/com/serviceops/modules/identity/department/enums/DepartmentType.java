package com.serviceops.modules.identity.department.enums;

/**
 * Loai don vi trong cay to chuc. {@code rank} the hien cap bac (so cang nho
 * cang cao), theo dung 4 tang phan cap: Trung tam > Ban > Phong > To/Nhom.
 * Dung de rang buoc: mot don vi khong the truc thuoc don vi co cap thap hon
 * minh (vi du: Ban khong the la con cua Phong, Trung tam khong the la con
 * cua Ban).
 *
 * <p>Truoc day TRUNG_TAM va BAN cung rank 0 (ngang hang) — do la ke ho khien
 * mot don vi ten "Trung Tam..." co the bi dat lam con cua mot "Ban", hien thi
 * sai thu bac tren cay (BE-DB regression, phat hien qua anh chup man hinh
 * thuc te: "Trung Tam Cong Nghe & Giai Phap" nam duoi "Ban Giam Doc"). Tach
 * rank rieng cho tung cap de rang buoc nay THAT SU chan duoc truong hop do,
 * khong chi dua vao ten goi.</p>
 */
public enum DepartmentType {
	TRUNG_TAM("Trung tam", 0),
	BAN("Ban", 1),
	PHONG("Phong", 2),
	TO("To / Nhom", 3);

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
