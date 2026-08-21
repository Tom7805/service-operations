package com.serviceops.common.masking;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.BeanProperty;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.ContextualSerializer;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

@Slf4j
public class MaskingJsonSerializer extends StdSerializer<Object> implements ContextualSerializer {
	static final String MASKED_VALUE = "***";

	private final String fieldName;

	public MaskingJsonSerializer() {
		this(null);
	}

	private MaskingJsonSerializer(String fieldName) {
		super(Object.class);
		this.fieldName = fieldName;
	}

	@Override
	public com.fasterxml.jackson.databind.JsonSerializer<?> createContextual(SerializerProvider prov, BeanProperty property)
			throws JsonMappingException {
		return new MaskingJsonSerializer(property != null ? property.getName() : null);
	}

	@Override
	public void serialize(Object value, JsonGenerator generator, SerializerProvider provider) throws IOException {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		boolean allowed = DataMaskingServiceImpl.hasSensitiveDataRole(authentication);
		String username = authentication != null ? authentication.getName() : "anonymous";
		log.info("SENSITIVE_DATA_ACCESS username={} field={} masked={}", username, fieldName, !allowed);

		if (!allowed) {
			generator.writeString(MASKED_VALUE);
			return;
		}
		provider.defaultSerializeValue(value, generator);
	}
}
