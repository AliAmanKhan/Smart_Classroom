package com.classroom.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class RabbitProducer {

    private final RabbitTemplate rabbitTemplate;

    @Bean
    public Queue passwordResetQueue() {
        return new Queue("password-reset-queue", true);
    }

    @Bean
    public Queue welcomeEmailQueue() {
        return new Queue("welcome-email-queue", true);
    }

    public void sendPasswordResetEmail(RabbitPasswordResetMessage message) {
        log.info("Sending password reset message to queue for email: {}", message.getEmail());
        rabbitTemplate.convertAndSend("password-reset-queue", message);
    }

    public void sendWelcomeEmail(RabbitWelcomeMessage message) {
        log.info("Sending welcome message to queue for email: {}", message.getEmail());
        rabbitTemplate.convertAndSend("welcome-email-queue", message);
    }
}
