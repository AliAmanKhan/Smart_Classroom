package com.classroom.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Exposes a ChatClient bean for dependency injection into AI services.
 *
 * Spring AI 1.0+ auto-configures a ChatClient.Builder but does NOT
 * create a ChatClient bean directly — we must build it here so that
 * NvidiaAIService can inject it via @RequiredArgsConstructor.
 */
@Configuration
public class AiConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder.build();
    }
}
