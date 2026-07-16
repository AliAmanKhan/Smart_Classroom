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
    public Queue aiNotesRetryQueue() {
        return new Queue("ai-notes-retry-queue", true);
    }

    public void sendAiNotesRetryMessage(AiNotesRetryMessage message) {
        log.info("Queueing material {} for AI notes retry.", message.getMaterialId());
        rabbitTemplate.convertAndSend("ai-notes-retry-queue", message);
    }
}
