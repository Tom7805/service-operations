package com.serviceops.common.util;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.BiFunction;

import org.springframework.data.jpa.domain.Specification;

import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

/**
 * Tien ich dung chung cho cac danh sach phan trang: dua bo loc/pham vi xuong SQL thay vi nap
 * toan bang roi loc bang Java — trang chi doc dung so dong can hien.
 */
public final class SpecSupport {

	private SpecSupport() {
	}

	/** Chuan hoa tu khoa: bo khoang trang dau/cuoi, chuoi rong -> null, ve chu thuong. */
	public static String normalize(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
	}

	/**
	 * Ky tu thoat cho LIKE. Khong dung dau gach nguoc: Hibernate sinh {@code ESCAPE '\'} ma MySQL
	 * (che do mac dinh) doc dau gach nguoc do la thoat dau nhay -> loi cu phap.
	 */
	private static final char LIKE_ESCAPE = '!';

	/** Mau LIKE "chua" da thoat ky tu dac biet (%, _, !) de tu khoa nguoi dung nhap duoc so khop nguyen van. */
	public static String containsPattern(String normalizedKeyword) {
		String escaped = normalizedKeyword
				.replace("!", "!!")
				.replace("%", "!%")
				.replace("_", "!_");
		return "%" + escaped + "%";
	}

	/** {@code lower(path) LIKE %keyword%} (keyword da chuan hoa). Cot null khong khop. */
	public static Predicate containsIgnoreCase(CriteriaBuilder cb, Expression<String> path, String normalizedKeyword) {
		return cb.like(cb.lower(path), containsPattern(normalizedKeyword), LIKE_ESCAPE);
	}

	/** {@code lower(trim(path)) = value} (value da chuan hoa) — khop cach so sanh equalsIgnoreCase(trim) cu. */
	public static Predicate equalsIgnoreCase(CriteriaBuilder cb, Expression<String> path, String normalizedValue) {
		return cb.equal(cb.lower(cb.trim(path)), normalizedValue);
	}

	/**
	 * Pham vi du lieu theo "nguoi phu trach" (QTN-01) — tuong duong SQL cua cac ham
	 * {@code inCurrentScope} trong service: COMPANY khong gioi han; SELF chi ban ghi do chinh
	 * nguoi xem phu trach; DEPARTMENT khi phong ban (hien tai) cua nguoi phu trach nam trong
	 * pham vi. Ban ghi khong co nguoi phu trach bi loai o moi pham vi khac COMPANY.
	 */
	public static <E> Specification<E> ownerInScope(UserScope scope, Long currentUserId, String ownerAttribute) {
		return (root, query, cb) -> {
			if (scope.isCompanyWide()) {
				return cb.conjunction();
			}
			Path<Long> owner = root.get(ownerAttribute);
			if (scope.type() == DataScopeType.SELF) {
				return currentUserId == null ? cb.disjunction() : cb.equal(owner, currentUserId);
			}
			if (scope.type() == DataScopeType.DEPARTMENT) {
				if (scope.departmentIds().isEmpty()) {
					return cb.disjunction();
				}
				Subquery<Long> owners = query.subquery(Long.class);
				Root<User> user = owners.from(User.class);
				owners.select(user.get("id")).where(user.get("departmentId").in(scope.departmentIds()));
				return owner.in(owners);
			}
			return cb.disjunction();
		};
	}

	/**
	 * {@code idPath IN (SELECT id FROM target WHERE lower(nameAttribute) LIKE %keyword%)} — tim theo
	 * ten cua ban ghi lien ket (vd ten khach hang) ma khong can join hay nap truoc.
	 */
	public static <T> Predicate relatedNameContains(CriteriaQuery<?> query, CriteriaBuilder cb, Path<Long> idPath,
			Class<T> target, String nameAttribute, String normalizedKeyword) {
		Subquery<Long> ids = query.subquery(Long.class);
		Root<T> related = ids.from(target);
		ids.select(related.get("id")).where(containsIgnoreCase(cb, related.get(nameAttribute), normalizedKeyword));
		return idPath.in(ids);
	}

	/** Cac gia tri khac rong, khong trung (da trim) cua mot cot chuoi trong tap ban ghi khop {@code spec}. */
	public static <E> List<String> distinctValues(EntityManager em, Class<E> entity, Specification<E> spec,
			String attribute) {
		CriteriaBuilder cb = em.getCriteriaBuilder();
		CriteriaQuery<String> q = cb.createQuery(String.class);
		Root<E> root = q.from(entity);
		Expression<String> value = cb.trim(root.get(attribute));
		List<Predicate> where = new ArrayList<>();
		Predicate scoped = spec.toPredicate(root, q, cb);
		if (scoped != null) {
			where.add(scoped);
		}
		where.add(cb.isNotNull(root.get(attribute)));
		where.add(cb.notEqual(value, ""));
		q.select(value).distinct(true).where(where.toArray(Predicate[]::new)).orderBy(cb.asc(value));
		return em.createQuery(q).getResultList();
	}

	/** Tong mot bieu thuc so tren tap ban ghi khop {@code spec}; khong co dong nao -> 0. */
	public static <E> BigDecimal sum(EntityManager em, Class<E> entity, Specification<E> spec,
			BiFunction<Root<E>, CriteriaBuilder, Expression<? extends Number>> expression) {
		CriteriaBuilder cb = em.getCriteriaBuilder();
		CriteriaQuery<Number> q = cb.createQuery(Number.class);
		Root<E> root = q.from(entity);
		q.select(cb.sum(expression.apply(root, cb)));
		Predicate scoped = spec.toPredicate(root, q, cb);
		if (scoped != null) {
			q.where(scoped);
		}
		Number result = em.createQuery(q).getSingleResult();
		if (result == null) {
			return BigDecimal.ZERO;
		}
		return result instanceof BigDecimal bd ? bd : new BigDecimal(result.toString());
	}
}
