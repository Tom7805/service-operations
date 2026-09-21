package com.serviceops.modules.invoice.enums;

/**
 * Nhom tuoi no theo so ngay qua han (NCL-10-CN-004). Hoa don qua han tu ngay ke tiep han thanh toan,
 * nen so ngay qua han nho nhat la 1. Hoa don qua han tren 30 ngay nam o cac nhom tu {@link #DAYS_31_60} tro di.
 */
public enum AgingBucket {

	DAYS_1_30("Qua han 1-30 ngay", 1, 30),
	DAYS_31_60("Qua han 31-60 ngay", 31, 60),
	DAYS_61_90("Qua han 61-90 ngay", 61, 90),
	OVER_90("Qua han tren 90 ngay", 91, null);

	private final String label;
	private final int fromDays;
	private final Integer toDays;

	AgingBucket(String label, int fromDays, Integer toDays) {
		this.label = label;
		this.fromDays = fromDays;
		this.toDays = toDays;
	}

	public String getLabel() {
		return label;
	}

	/** So ngay qua han thap nhat cua nhom (gom). */
	public int getFromDays() {
		return fromDays;
	}

	/** So ngay qua han cao nhat cua nhom (gom); {@code null} = khong gioi han tren. */
	public Integer getToDays() {
		return toDays;
	}

	/**
	 * @param daysOverdue so ngay qua han, phai {@code >= 1}
	 */
	public static AgingBucket of(long daysOverdue) {
		if (daysOverdue < 1) {
			throw new IllegalArgumentException("So ngay qua han phai >= 1 nhung nhan " + daysOverdue);
		}
		for (AgingBucket bucket : values()) {
			if (bucket.toDays == null || daysOverdue <= bucket.toDays) {
				return bucket;
			}
		}
		throw new IllegalStateException("Khong co nhom tuoi no cho " + daysOverdue + " ngay");
	}
}
