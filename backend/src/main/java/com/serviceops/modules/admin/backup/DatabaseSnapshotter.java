package com.serviceops.modules.admin.backup;

import com.fasterxml.jackson.core.JsonEncoding;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Chup va dung lai toan bo du lieu van hanh bang JDBC thuan (NCL-15-CN-003). Danh sach bang va cot doc tu
 * {@link DatabaseMetaData} nen bang moi cua cac Epic sau tu dong duoc sao luu, khong phai sua lop nay.
 *
 * <p><b>Dinh dang tep</b> ({@value #FORMAT}): JSON
 * {@code {format, tables:[{name, columns:[{name, type}], rows:[[...]]}]}}. Moi gia tri luu duoi dang chuoi
 * (cot nhi phan ma hoa Base64, cot logic luu "true"/"false") de khong phu thuoc kieu du lieu cua driver.</p>
 *
 * <p><b>Bang khong sao luu / khong phuc hoi</b> ({@link #EXCLUDED_TABLES}): lich su Flyway, chinh cac bang
 * sao luu/nhap du lieu, nhat ky he thong va du lieu phien dang nhap. Nhat ky duoc giu nguyen qua moi lan
 * phuc hoi — dau vet "ai da phuc hoi luc nao" khong bi chinh ban sao cu xoa mat.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSnapshotter {

	public static final String FORMAT = "service-operations-backup/v1";

	static final Set<String> EXCLUDED_TABLES = Set.of(
			"flyway_schema_history",
			"backup_records", "restore_requests",
			"import_jobs", "import_errors",
			"audit_logs", "sensitive_access_logs",
			"login_attempts", "user_sessions", "password_reset_tokens");

	private static final int INSERT_BATCH_SIZE = 500;

	private final JdbcTemplate jdbcTemplate;
	private final ObjectMapper objectMapper;

	public record SnapshotStats(int tableCount, long rowCount) {}

	/** Ghi toan bo du lieu cac bang van hanh vao {@code out} (khong dong {@code out}). */
	public SnapshotStats dump(OutputStream out) {
		return jdbcTemplate.execute((ConnectionCallback<SnapshotStats>) connection -> {
			try (JsonGenerator json = objectMapper.getFactory().createGenerator(out, JsonEncoding.UTF8)
					.disable(JsonGenerator.Feature.AUTO_CLOSE_TARGET)) {
				json.writeStartObject();
				json.writeStringField("format", FORMAT);
				json.writeArrayFieldStart("tables");
				int tableCount = 0;
				long rowCount = 0;
				for (TableInfo table : listTables(connection)) {
					rowCount += dumpTable(connection, table, json);
					tableCount++;
				}
				json.writeEndArray();
				json.writeEndObject();
				json.flush();
				return new SnapshotStats(tableCount, rowCount);
			} catch (IOException ioe) {
				throw new UncheckedIOException(ioe);
			}
		});
	}

	/**
	 * Xoa du lieu hien tai cua cac bang van hanh roi nap lai tu ban sao. Phai goi trong mot giao dich — loi o bat ky
	 * bang nao thi giao dich rollback va du lieu hien tai giu nguyen.
	 *
	 * @throws BusinessRuleException {@code INVALID_STATE} khi cau truc du lieu cua ban sao khong con khop cau truc
	 *                               hien tai (ban sao tao truoc mot lan nang cap CSDL).
	 */
	public SnapshotStats restore(JsonNode snapshot) {
		if (!FORMAT.equals(snapshot.path("format").asText())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Tep sao luu khong dung dinh dang " + FORMAT);
		}
		return jdbcTemplate.execute((ConnectionCallback<SnapshotStats>) connection -> {
			List<TableInfo> current = listTables(connection);
			Map<String, JsonNode> backupTables = new LinkedHashMap<>();
			for (JsonNode table : snapshot.path("tables")) {
				backupTables.put(table.path("name").asText().toLowerCase(Locale.ROOT), table);
			}
			assertCompatible(current, backupTables);

			boolean mysql = isMySql(connection);
			setReferentialIntegrity(connection, mysql, false);
			try {
				long rows = 0;
				for (TableInfo table : current) {
					rows += restoreTable(connection, table, backupTables.get(table.key()));
				}
				return new SnapshotStats(current.size(), rows);
			} finally {
				setReferentialIntegrity(connection, mysql, true);
			}
		});
	}

	// ------------------------------------------------------------------ dump

	private long dumpTable(Connection connection, TableInfo table, JsonGenerator json) throws SQLException, IOException {
		json.writeStartObject();
		json.writeStringField("name", table.key());
		json.writeArrayFieldStart("columns");
		for (ColumnInfo column : table.columns()) {
			json.writeStartObject();
			json.writeStringField("name", column.key());
			json.writeNumberField("type", column.sqlType());
			json.writeEndObject();
		}
		json.writeEndArray();
		json.writeArrayFieldStart("rows");
		long count = 0;
		String sql = "SELECT " + columnList(connection, table) + " FROM " + quote(connection, table.name());
		try (Statement statement = connection.createStatement(); ResultSet rs = statement.executeQuery(sql)) {
			while (rs.next()) {
				json.writeStartArray();
				for (int i = 0; i < table.columns().size(); i++) {
					String value = readValue(rs, i + 1, table.columns().get(i).sqlType());
					if (value == null) {
						json.writeNull();
					} else {
						json.writeString(value);
					}
				}
				json.writeEndArray();
				count++;
			}
		}
		json.writeEndArray();
		json.writeEndObject();
		return count;
	}

	private static String readValue(ResultSet rs, int index, int sqlType) throws SQLException {
		if (isBinary(sqlType)) {
			byte[] bytes = rs.getBytes(index);
			return bytes == null ? null : Base64.getEncoder().encodeToString(bytes);
		}
		if (isBoolean(sqlType)) {
			boolean value = rs.getBoolean(index);
			return rs.wasNull() ? null : Boolean.toString(value);
		}
		return rs.getString(index);
	}

	// --------------------------------------------------------------- restore

	private long restoreTable(Connection connection, TableInfo table, JsonNode backup) throws SQLException {
		try (Statement statement = connection.createStatement()) {
			statement.executeUpdate("DELETE FROM " + quote(connection, table.name()));
		}
		// Thu tu cot trong tep co the khac thu tu cot hien tai — anh xa theo ten.
		List<String> fileColumns = new ArrayList<>();
		for (JsonNode column : backup.path("columns")) {
			fileColumns.add(column.path("name").asText().toLowerCase(Locale.ROOT));
		}
		Map<String, ColumnInfo> byKey = table.columns().stream()
				.collect(Collectors.toMap(ColumnInfo::key, c -> c));
		List<ColumnInfo> ordered = fileColumns.stream().map(byKey::get).toList();

		String placeholders = ordered.stream().map(c -> "?").collect(Collectors.joining(", "));
		String sql = "INSERT INTO " + quote(connection, table.name()) + " ("
				+ ordered.stream().map(c -> quote(connection, c.name())).collect(Collectors.joining(", "))
				+ ") VALUES (" + placeholders + ")";
		long count = 0;
		try (PreparedStatement insert = connection.prepareStatement(sql)) {
			int pending = 0;
			for (JsonNode row : backup.path("rows")) {
				Iterator<JsonNode> values = row.elements();
				for (int i = 0; i < ordered.size(); i++) {
					JsonNode value = values.hasNext() ? values.next() : null;
					bindValue(insert, i + 1, ordered.get(i).sqlType(), value == null || value.isNull() ? null : value.asText());
				}
				insert.addBatch();
				count++;
				if (++pending == INSERT_BATCH_SIZE) {
					insert.executeBatch();
					pending = 0;
				}
			}
			if (pending > 0) {
				insert.executeBatch();
			}
		}
		return count;
	}

	private static void bindValue(PreparedStatement statement, int index, int sqlType, String value) throws SQLException {
		if (value == null) {
			statement.setNull(index, sqlType == Types.OTHER ? Types.NULL : sqlType);
		} else if (isBinary(sqlType)) {
			statement.setBytes(index, Base64.getDecoder().decode(value));
		} else if (isBoolean(sqlType)) {
			statement.setBoolean(index, Boolean.parseBoolean(value) || "1".equals(value));
		} else {
			statement.setString(index, value);
		}
	}

	private static void assertCompatible(List<TableInfo> current, Map<String, JsonNode> backupTables) {
		Set<String> currentNames = current.stream().map(TableInfo::key).collect(Collectors.toCollection(TreeSet::new));
		Set<String> backupNames = new TreeSet<>(backupTables.keySet());
		if (!currentNames.equals(backupNames)) {
			Set<String> missing = new TreeSet<>(currentNames);
			missing.removeAll(backupNames);
			Set<String> extra = new TreeSet<>(backupNames);
			extra.removeAll(currentNames);
			throw incompatible("danh sach bang khac nhau"
					+ (missing.isEmpty() ? "" : ", ban sao thieu: " + missing)
					+ (extra.isEmpty() ? "" : ", ban sao co them: " + extra));
		}
		for (TableInfo table : current) {
			Set<String> currentColumns = table.columns().stream().map(ColumnInfo::key)
					.collect(Collectors.toCollection(TreeSet::new));
			Set<String> backupColumns = new TreeSet<>();
			backupTables.get(table.key()).path("columns")
					.forEach(column -> backupColumns.add(column.path("name").asText().toLowerCase(Locale.ROOT)));
			if (!currentColumns.equals(backupColumns)) {
				throw incompatible("cot cua bang " + table.key() + " da thay doi");
			}
		}
	}

	private static BusinessRuleException incompatible(String detail) {
		return new BusinessRuleException(ErrorCode.INVALID_STATE,
				"Ban sao luu khong khop cau truc du lieu hien tai (" + detail + "), khong phuc hoi duoc");
	}

	private static void setReferentialIntegrity(Connection connection, boolean mysql, boolean enabled) throws SQLException {
		try (Statement statement = connection.createStatement()) {
			statement.execute(mysql
					? "SET FOREIGN_KEY_CHECKS = " + (enabled ? 1 : 0)
					: "SET REFERENTIAL_INTEGRITY " + (enabled ? "TRUE" : "FALSE"));
		}
	}

	// -------------------------------------------------------------- metadata

	private List<TableInfo> listTables(Connection connection) throws SQLException {
		DatabaseMetaData meta = connection.getMetaData();
		String catalog = connection.getCatalog();
		String schema = isMySql(connection) ? null : connection.getSchema();
		List<String> names = new ArrayList<>();
		try (ResultSet rs = meta.getTables(catalog, schema, "%", new String[]{"TABLE"})) {
			while (rs.next()) {
				String name = rs.getString("TABLE_NAME");
				if (!EXCLUDED_TABLES.contains(name.toLowerCase(Locale.ROOT))) {
					names.add(name);
				}
			}
		}
		names.sort(String.CASE_INSENSITIVE_ORDER);
		List<TableInfo> tables = new ArrayList<>(names.size());
		for (String name : names) {
			List<ColumnInfo> columns = new ArrayList<>();
			try (ResultSet rs = meta.getColumns(catalog, schema, name, "%")) {
				while (rs.next()) {
					columns.add(new ColumnInfo(rs.getString("COLUMN_NAME"), rs.getInt("DATA_TYPE"),
							rs.getInt("ORDINAL_POSITION")));
				}
			}
			columns.sort((a, b) -> Integer.compare(a.position(), b.position()));
			tables.add(new TableInfo(name, columns));
		}
		return tables;
	}

	private static String columnList(Connection connection, TableInfo table) {
		return table.columns().stream().map(c -> quote(connection, c.name())).collect(Collectors.joining(", "));
	}

	private static String quote(Connection connection, String identifier) {
		try {
			String q = connection.getMetaData().getIdentifierQuoteString();
			q = q == null || q.isBlank() ? "" : q.trim();
			return q + identifier.replace(q.isEmpty() ? "\0" : q, q + q) + q;
		} catch (SQLException e) {
			throw new IllegalStateException("Khong doc duoc ky tu bao ten cot cua CSDL", e);
		}
	}

	private static boolean isMySql(Connection connection) throws SQLException {
		return connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT).contains("mysql");
	}

	private static boolean isBinary(int sqlType) {
		return sqlType == Types.BINARY || sqlType == Types.VARBINARY || sqlType == Types.LONGVARBINARY
				|| sqlType == Types.BLOB;
	}

	private static boolean isBoolean(int sqlType) {
		return sqlType == Types.BIT || sqlType == Types.BOOLEAN;
	}

	private record TableInfo(String name, List<ColumnInfo> columns) {
		String key() {
			return name.toLowerCase(Locale.ROOT);
		}
	}

	private record ColumnInfo(String name, int sqlType, int position) {
		String key() {
			return name.toLowerCase(Locale.ROOT);
		}
	}
}
