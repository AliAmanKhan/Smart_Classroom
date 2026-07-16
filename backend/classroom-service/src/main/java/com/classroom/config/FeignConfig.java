package com.classroom.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Adds the X-Internal-Key header to all outbound Feign calls so that the
 * IAM service's InternalApiKeyFilter allows them through.
 */
@Configuration
public class FeignConfig {

    @Value("${internal.api-key}")
    private String internalApiKey;

    @Bean
    public RequestInterceptor internalKeyInterceptor() {
        return template -> template.header("X-Internal-Key", internalApiKey);
    }
}

