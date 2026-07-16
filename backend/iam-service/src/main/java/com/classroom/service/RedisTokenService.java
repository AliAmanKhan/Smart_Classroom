package com.classroom.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Centralised Redis service for the IAM service.
 *
 * Two responsibilities:
 *  1. Password-reset token storage — replaces the DB-backed PasswordResetToken
 *     table so that tokens automatically expire in Redis (no cron/cleanup needed).
 *  2. JWT blacklist — when a user logs out we store the raw JWT in Redis with a
 *     TTL equal to its remaining valid time so the JwtAuthenticationFilter can
 *     reject it before it naturally expires.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RedisTokenService {

    private static final String PASSWORD_RESET_PREFIX = "pwd_reset:";
    private static final String BLACKLIST_PREFIX      = "jwt_blacklist:";

    private final StringRedisTemplate redisTemplate;

    // -------------------------------------------------------------------------
    // Password reset token helpers
    // -------------------------------------------------------------------------

    /**
     * Stores a password-reset token mapped to the user's email with a TTL.
     *
     * @param token              the generated reset token
     * @param email              the user's email address
     * @param expirationMinutes  lifetime of the token in minutes
     */
    public void savePasswordResetToken(String token, String email, long expirationMinutes) {
        String key = PASSWORD_RESET_PREFIX + token;
        redisTemplate.opsForValue().set(key, email, expirationMinutes, TimeUnit.MINUTES);
        log.debug("Stored password-reset token for {} (TTL {} min)", email, expirationMinutes);
    }

    /**
     * Returns the email associated with the given reset token, or {@code null}
     * if the token is not present (i.e. expired or never issued).
     */
    public String getEmailByPasswordResetToken(String token) {
        return redisTemplate.opsForValue().get(PASSWORD_RESET_PREFIX + token);
    }

    /**
     * Deletes a password-reset token after it has been consumed.
     */
    public void deletePasswordResetToken(String token) {
        redisTemplate.delete(PASSWORD_RESET_PREFIX + token);
        log.debug("Deleted password-reset token {}", token);
    }

    /**
     * Returns {@code true} when a reset token exists (not expired) in Redis.
     */
    public boolean passwordResetTokenExists(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(PASSWORD_RESET_PREFIX + token));
    }

    // -------------------------------------------------------------------------
    // JWT blacklist helpers
    // -------------------------------------------------------------------------

    /**
     * Adds a JWT to the blacklist so it is rejected on every subsequent request,
     * even though the signature is technically still valid.
     *
     * @param jwt              the raw JWT string
     * @param remainingMillis  milliseconds until the token naturally expires
     */
    public void blacklistToken(String jwt, long remainingMillis) {
        if (remainingMillis <= 0) {
            // Token is already expired — nothing to blacklist
            return;
        }
        String key = BLACKLIST_PREFIX + jwt;
        redisTemplate.opsForValue().set(key, "blacklisted", remainingMillis, TimeUnit.MILLISECONDS);
        log.debug("JWT blacklisted for {} ms", remainingMillis);
    }

    /**
     * Returns {@code true} when the given JWT is on the blacklist.
     */
    public boolean isTokenBlacklisted(String jwt) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + jwt));
    }
}
