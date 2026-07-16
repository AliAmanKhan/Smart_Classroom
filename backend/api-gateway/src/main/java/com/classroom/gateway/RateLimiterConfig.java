package com.classroom.gateway;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

import java.util.Base64;
import java.util.Optional;

/**
 * Configures the Redis-backed rate limiter's key resolution strategy.
 *
 * <p>Rate limiting is per-identity, resolved in priority order:
 * <ol>
 *   <li>JWT subject (user ID) — extracted from the Bearer token without full validation.
 *       The downstream service does the full crypto validation; here we just need a stable key.
 *   <li>X-Forwarded-For header — used when the request is from an upstream proxy/LB.
 *   <li>Remote IP address — final fallback for unauthenticated callers (e.g. /auth/register).
 * </ol>
 *
 * <p>This bean is marked {@code @Primary} so Spring Cloud Gateway's auto-configuration
 * picks it up when no explicit keyResolver is named in the route filter config.
 */
@Configuration
public class RateLimiterConfig {

    /**
     * Primary key resolver used by all routes unless overridden per-filter.
     *
     * <p>Extracts the JWT <em>sub</em> claim (user email) without full signature validation
     * — purely for bucketing. The gateway is not a security boundary for token authenticity;
     * that responsibility stays with each downstream microservice.
     */
    @Bean
    @Primary
    public KeyResolver userKeyResolver() {
        return exchange -> {
            // 1. Try extracting subject from JWT Bearer token
            String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String jwt = authHeader.substring(7);
                Optional<String> subject = extractJwtSubject(jwt);
                if (subject.isPresent()) {
                    return Mono.just("user:" + subject.get());
                }
            }

            // 2. Fall back to X-Forwarded-For (first IP in the chain if behind a proxy)
            String forwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                String clientIp = forwardedFor.split(",")[0].trim();
                return Mono.just("ip:" + clientIp);
            }

            // 3. Final fallback: direct remote address
            String remoteAddress = Optional.ofNullable(exchange.getRequest().getRemoteAddress())
                    .map(addr -> addr.getAddress().getHostAddress())
                    .orElse("unknown");
            return Mono.just("ip:" + remoteAddress);
        };
    }

    /**
     * Decodes the JWT payload (middle section) and extracts the "sub" claim.
     * No signature verification — this is intentional; we only need a stable bucket key.
     */
    private Optional<String> extractJwtSubject(String jwt) {
        try {
            String[] parts = jwt.split("\\.");
            if (parts.length < 2) return Optional.empty();

            // Base64url decode (no padding required)
            byte[] payloadBytes = Base64.getUrlDecoder().decode(padBase64(parts[1]));
            String payload = new String(payloadBytes);

            // Simple string search for "sub":"value" — avoids pulling in a JSON library
            int subIndex = payload.indexOf("\"sub\":");
            if (subIndex == -1) return Optional.empty();

            int start = payload.indexOf('"', subIndex + 6) + 1;
            int end = payload.indexOf('"', start);
            if (start <= 0 || end <= start) return Optional.empty();

            return Optional.of(payload.substring(start, end));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private String padBase64(String base64) {
        int pad = base64.length() % 4;
        if (pad == 2) return base64 + "==";
        if (pad == 3) return base64 + "=";
        return base64;
    }
}
