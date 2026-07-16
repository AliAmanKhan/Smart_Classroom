package com.classroom.service;

import com.classroom.exception.AiNotesGenerationException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.document.Document;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NvidiaAIService {

    @Value("${spring.ai.openai.api-key}")
    private String apiKey;

    private static final int SAFE_THRESHOLD = 15000;
    private static final int CHUNK_SIZE = 8000;

    private final ChatClient chatClient;

    @io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker(name = "nvidiaAi")
    public String generateNotesFromTranscript(String transcript, String videoTitle, java.util.function.Consumer<String> progressCallback) {
        if (transcript == null || transcript.isBlank()) {
            throw new IllegalArgumentException("Transcript must not be null or blank");
        }
        long startTime = System.currentTimeMillis();
        String title = videoTitle != null ? videoTitle : "Educational Video";

        try {
            String result = processTranscriptRecursively(transcript, title, progressCallback, 1);
            long duration = System.currentTimeMillis() - startTime;
            log.info("AI notes generation completed for '{}' in {} ms", title, duration);
            return result;
        } catch (IllegalArgumentException e) {
            log.error("Invalid input for AI notes generation: {}", e.getMessage());
            throw e;
        } catch (AiNotesGenerationException e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("AI notes generation failed for '{}' after {} ms: {}", title, duration, e.getMessage());
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Unexpected error during AI notes generation for '{}' after {} ms", title, duration, e);
            throw new AiNotesGenerationException("Failed to generate AI notes for: " + title, e);
        }
    }

    private String processTranscriptRecursively(String content, String title, java.util.function.Consumer<String> progressCallback, int depth) {
        // Base case: content is small enough — process it directly.
        // We use character length as a fast proxy for token count estimation.
        if (content.length() <= SAFE_THRESHOLD) {
            log.info("Content size ({}) is within safe threshold ({}). Processing directly.", content.length(), SAFE_THRESHOLD);
            return processSingleChunk(content, title, PromptTemplates.GENERATE_NOTES_PROMPT);
        }

        log.info("Content size ({}) exceeds threshold ({}). Splitting into chunks...", content.length(), SAFE_THRESHOLD);

        // Split using TokenTextSplitter.
        // Note: Spring AI's TokenTextSplitter uses a default chunk size (typically 800 tokens).
        // Since the constructor for custom size/overlap varies across Spring AI versions,
        // we use the default constructor to ensure compatibility, which safely chunks based on tokens.
        TokenTextSplitter splitter = new TokenTextSplitter();
        List<Document> documents = splitter.split(List.of(new Document(content)));

        if (documents.isEmpty()) {
            throw new AiNotesGenerationException("TokenTextSplitter produced no chunks for content of length: " + content.length());
        }

        log.info("Split content into {} chunks.", documents.size());

        StringBuilder combinedNotes = new StringBuilder();
        for (int i = 0; i < documents.size(); i++) {
            if (progressCallback != null) {
                progressCallback.accept(String.format("Generating AI notes... (Pass %d: processing chunk %d of %d)", depth, i + 1, documents.size()));
            }
            log.info("Pass {}: Processing chunk {}/{}...", depth, (i + 1), documents.size());
            String chunkSummary = processSingleChunk(documents.get(i).getText(), title, PromptTemplates.CHUNK_SUMMARIZE_PROMPT);
            combinedNotes.append(chunkSummary).append("\n\n");
        }

        String combinedResult = combinedNotes.toString().trim();

        // Recursion step: if the combined notes still exceed the threshold, recurse.
        if (combinedResult.length() > SAFE_THRESHOLD) {
            if (progressCallback != null) {
                progressCallback.accept(String.format("Generating AI notes... (Pass %d finished. Preparing for Pass %d)", depth, depth + 1));
            }
            log.info("Combined notes size ({}) still exceeds threshold. Recursing to pass {}...", combinedResult.length(), depth + 1);
            return processTranscriptRecursively(combinedResult, title, progressCallback, depth + 1);
        }

        if (progressCallback != null) {
            progressCallback.accept("Generating AI notes... (Final polish)");
        }
        // Final Polish step: combined notes are within the safe limit.
        log.info("Polishing combined notes (size: {}).", combinedResult.length());
        return processSingleChunk(combinedResult, title, PromptTemplates.FINAL_POLISH_PROMPT);
    }

    private String processSingleChunk(String content, String title, String promptTemplate) {
        try {
            String finalPrompt = promptTemplate.formatted(title, content);
            String result = chatClient.prompt(finalPrompt).call().content();
            if (result == null || result.isBlank()) {
                throw new AiNotesGenerationException("AI model returned an empty response for title: " + title);
            }
            return result;
        } catch (AiNotesGenerationException e) {
            throw e;
        } catch (Exception e) {
            throw new AiNotesGenerationException("AI model call failed: " + e.getMessage(), e);
        }
    }
}
