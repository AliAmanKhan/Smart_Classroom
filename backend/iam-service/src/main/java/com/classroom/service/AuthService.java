package com.classroom.service;

import com.classroom.dto.AuthResponse;
import com.classroom.dto.LoginRequest;
import com.classroom.dto.RegisterRequest;
import com.classroom.model.User;
import com.classroom.repository.UserRepository;
import com.classroom.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import com.classroom.messaging.RabbitProducer;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final RabbitProducer rabbitProducer;
    private final RedisTokenService redisTokenService;  // ← Redis-backed token store

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setRole(request.getRole());
        user.setEnabled(true);

        user = userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        // Send welcome email asynchronously
        rabbitProducer.sendWelcomeEmail(
                new com.classroom.messaging.RabbitWelcomeMessage(user.getEmail(), user.getFullName(), user.getRole().name()));

        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }

    /**
     * Invalidates the given JWT by placing it in Redis until it naturally expires.
     * The client must discard the token; any subsequent request carrying it will be
     * rejected by {@link com.classroom.security.JwtAuthenticationFilter}.
     */
    public void logout(String jwt) {
        Date expiry = jwtUtil.extractExpiration(jwt);
        long remainingMillis = expiry.getTime() - System.currentTimeMillis();
        redisTokenService.blacklistToken(jwt, remainingMillis);
    }

    /**
     * Generates a password-reset token and stores it in Redis with a 15-minute TTL.
     * Tokens are simple Redis keys (prefix "pwd_reset:") that expire automatically —
     * no database table or cron cleanup required.
     */
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User with this email not found"));

        // Generate a simple 8-character uppercase code
        String token = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Store token → email in Redis with a 15-minute TTL
        redisTokenService.savePasswordResetToken(token, user.getEmail(), 15);

        // Send RabbitMQ message
        rabbitProducer.sendPasswordResetEmail(
                new com.classroom.messaging.RabbitPasswordResetMessage(user.getEmail(), token, user.getFullName()));
    }

    /**
     * Verifies the Redis-stored reset token and updates the user's password.
     * The token is deleted from Redis once consumed (one-time use).
     */
    public void resetPassword(String token, String newPassword) {
        // Look up the email from Redis
        String email = redisTokenService.getEmailByPasswordResetToken(token);
        if (email == null) {
            throw new RuntimeException("Invalid or expired token");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Consume (delete) the token — it is single-use
        redisTokenService.deletePasswordResetToken(token);
    }
}
