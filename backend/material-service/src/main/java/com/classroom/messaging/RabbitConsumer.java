package com.classroom.messaging;

import com.classroom.service.AINotesGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RabbitConsumer {

    private final AINotesGenerationService aiNotesGenerationService;

    @RabbitListener(queuesToDeclare = @Queue("ai-notes-retry-queue"))
    public void processAiNotesRetry(AiNotesRetryMessage message) {
        log.info("Processing deferred AI notes generation for materialId={} (Retry count: {})", 
                message.getMaterialId(), message.getRetryCount());
                
        // Call a synchronous version that throws exceptions so Spring AMQP can handle backoff retries
        aiNotesGenerationService.generateAINotesSync(message.getMaterialId());
    }
}
