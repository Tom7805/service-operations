package com.serviceops.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Locale;

/**
 * Xác thực hai bước kiểu Google Authenticator/Authy — TOTP theo RFC 6238
 * (dựa trên HOTP, RFC 4226), thuật toán HMAC-SHA1, chu kỳ 30 giây, 6 chữ số.
 *
 * <p>Không cần gửi mã qua email/SMS: máy chủ và ứng dụng Authenticator cùng
 * giữ một khóa bí mật ({@code secret}, mã hóa Base32 để dễ nhập tay/hiển thị
 * QR) và cùng tính mã theo giờ hệ thống — không tốn kênh gửi tin, không có độ
 * trễ mạng, hoạt động cả khi điện thoại offline.</p>
 */
public final class TotpUtil {

	private static final int SECRET_BYTES = 20; // 160-bit, khuyến nghị RFC 4226
	private static final int CODE_DIGITS = 6;
	private static final int TIME_STEP_SECONDS = 30;
	private static final String HMAC_ALGO = "HmacSHA1";
	private static final char[] BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();
	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private TotpUtil() {
	}

	/** Sinh khóa bí mật ngẫu nhiên mới, mã hóa Base32 (RFC 4648) — không có dấu '='. */
	public static String generateSecret() {
		byte[] bytes = new byte[SECRET_BYTES];
		SECURE_RANDOM.nextBytes(bytes);
		return base32Encode(bytes);
	}

	/**
	 * Chuỗi {@code otpauth://} chuẩn để ứng dụng Authenticator vẽ mã QR / nhập tay.
	 * @param secret     khóa bí mật Base32 (chưa mã hóa URL)
	 * @param accountName tên hiển thị trong app (VD: username)
	 * @param issuer     tên hệ thống hiển thị trong app (VD: "Van Hanh Dich Vu")
	 */
	public static String buildOtpAuthUri(String secret, String accountName, String issuer) {
		String label = urlEncode(issuer) + ":" + urlEncode(accountName);
		return "otpauth://totp/" + label
				+ "?secret=" + secret
				+ "&issuer=" + urlEncode(issuer)
				+ "&algorithm=SHA1&digits=" + CODE_DIGITS + "&period=" + TIME_STEP_SECONDS;
	}

	/**
	 * Kiểm mã 6 số người dùng nhập so với mã hệ thống tính ra tại đúng thời điểm
	 * hiện tại, cho phép lệch {@code driftSteps} chu kỳ 30 giây mỗi hướng để bù
	 * đồng hồ điện thoại/máy chủ không khớp tuyệt đối (thực hành chuẩn của TOTP).
	 */
	public static boolean verifyCode(String secretBase32, String code, int driftSteps) {
		if (secretBase32 == null || code == null || !code.matches("\\d{" + CODE_DIGITS + "}")) {
			return false;
		}
		long currentStep = System.currentTimeMillis() / 1000L / TIME_STEP_SECONDS;
		byte[] key = base32Decode(secretBase32);
		for (int drift = -driftSteps; drift <= driftSteps; drift++) {
			String candidate = generateCodeForStep(key, currentStep + drift);
			if (candidate.equals(code)) {
				return true;
			}
		}
		return false;
	}

	private static String generateCodeForStep(byte[] key, long step) {
		byte[] counter = new byte[8];
		for (int i = 7; i >= 0; i--) {
			counter[i] = (byte) (step & 0xff);
			step >>= 8;
		}
		try {
			Mac mac = Mac.getInstance(HMAC_ALGO);
			mac.init(new SecretKeySpec(key, HMAC_ALGO));
			byte[] hash = mac.doFinal(counter);

			int offset = hash[hash.length - 1] & 0x0f;
			int binary = ((hash[offset] & 0x7f) << 24)
					| ((hash[offset + 1] & 0xff) << 16)
					| ((hash[offset + 2] & 0xff) << 8)
					| (hash[offset + 3] & 0xff);

			int otp = binary % (int) Math.pow(10, CODE_DIGITS);
			return String.format(Locale.ROOT, "%0" + CODE_DIGITS + "d", otp);
		} catch (Exception e) {
			throw new IllegalStateException("Khong the tinh ma TOTP", e);
		}
	}

	private static String base32Encode(byte[] data) {
		StringBuilder sb = new StringBuilder();
		int bits = 0, value = 0;
		for (byte b : data) {
			value = (value << 8) | (b & 0xff);
			bits += 8;
			while (bits >= 5) {
				sb.append(BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f]);
				bits -= 5;
			}
		}
		if (bits > 0) {
			sb.append(BASE32_ALPHABET[(value << (5 - bits)) & 0x1f]);
		}
		return sb.toString();
	}

	private static byte[] base32Decode(String base32) {
		String clean = base32.trim().toUpperCase(Locale.ROOT).replace("=", "");
		int bits = 0, value = 0, index = 0;
		byte[] output = new byte[clean.length() * 5 / 8];
		for (int i = 0; i < clean.length(); i++) {
			int charValue = new String(BASE32_ALPHABET).indexOf(clean.charAt(i));
			if (charValue < 0) continue;
			value = (value << 5) | charValue;
			bits += 5;
			if (bits >= 8) {
				output[index++] = (byte) ((value >>> (bits - 8)) & 0xff);
				bits -= 8;
			}
		}
		return output;
	}

	private static String urlEncode(String value) {
		return value.replace(" ", "%20").replace(":", "%3A");
	}

	/** Chèn khoảng trắng mỗi 4 ký tự để hiển thị khóa bí mật dễ đọc/gõ tay (fallback khi không quét được QR). */
	public static String formatForDisplay(String secret) {
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < secret.length(); i += 4) {
			if (i > 0) sb.append(' ');
			sb.append(secret, i, Math.min(i + 4, secret.length()));
		}
		return sb.toString();
	}
}
