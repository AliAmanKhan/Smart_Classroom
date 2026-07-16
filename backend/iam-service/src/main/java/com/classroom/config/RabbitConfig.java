package com.classroom.config;

import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configures RabbitMQ to use JSON serialization instead of the default
 * Java object serialization. This avoids the deserialization allow-list
 * security restrictions introduced in Spring AMQP 3.x and produces
 * human-readable, language-agnostic messages on the wire.
 */
@Configuration
public class RabbitConfig {

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
