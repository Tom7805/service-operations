package com.serviceops.common.masking;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

public class MaskingJsonSerializer extends StdSerializer<Object> {
	static final String MASKED_VALUE = "***";

	public MaskingJsonSerializer() {
		super(Object.class);
	}

	@Override
	public void serialize(Object value, JsonGenerator generator, SerializerProvider provider) throws IOException {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (!DataMaskingServiceImpl.hasSensitiveDataRole(authentication)) {
			generator.writeString(MASKED_VALUE);
			return;
		}
		provider.defaultSerializeValue(value, generator);
	}
}
