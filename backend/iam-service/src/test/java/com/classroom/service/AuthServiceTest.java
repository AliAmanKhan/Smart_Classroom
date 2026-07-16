package com.classroom.service;

import com.classroom.dto.AuthResponse;
import com.classroom.dto.LoginRequest;
import com.classroom.dto.RegisterRequest;
import com.classroom.messaging.RabbitProducer;
import com.classroom.model.User;
import com.classroom.repository.UserRepository;
import com.classroom.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Date;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserDetailsService userDetailsService;
    @Mock private RabbitProducer rabbitProducer;
    @Mock private RedisTokenService redisTokenService;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setPassword("encoded-password");
        testUser.setFullName("Test User");
        testUser.setRole(User.UserRole.STUDENT);
        testUser.setEnabled(true);
    }

    // ---- Register Tests ----

    @Test
    @DisplayName("register - should create user and return auth response")
    void register_success() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@example.com");
        request.setPassword("password123");
        request.setFullName("New User");
        request.setRole(User.UserRole.STUDENT);

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(2L);
            return u;
        });

        UserDetails mockDetails = mock(UserDetails.class);
        when(userDetailsService.loadUserByUsername("new@example.com")).thenReturn(mockDetails);
        when(jwtUtil.generateToken(mockDetails)).thenReturn("jwt-token");

        AuthResponse response = authService.register(request);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getEmail()).isEqualTo("new@example.com");
        assertThat(response.getFullName()).isEqualTo("New User");
        assertThat(response.getRole()).isEqualTo(User.UserRole.STUDENT);
        verify(rabbitProducer).sendWelcomeEmail(any());
    }

    @Test
    @DisplayName("register - should throw when email already exists")
    void register_duplicateEmail_throws() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@example.com");
        request.setPassword("password");
        request.setFullName("User");
        request.setRole(User.UserRole.STUDENT);

        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Email already exists");

        verify(userRepository, never()).save(any());
    }

    // ---- Login Tests ----

    @Test
    @DisplayName("login - should authenticate and return token")
    void login_success() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        UserDetails mockDetails = mock(UserDetails.class);
        when(userDetailsService.loadUserByUsername("test@example.com")).thenReturn(mockDetails);
        when(jwtUtil.generateToken(mockDetails)).thenReturn("jwt-token");

        AuthResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getUserId()).isEqualTo(1L);
        verify(authenticationManager).authenticate(any());
    }

    @Test
    @DisplayName("login - should throw when user not found")
    void login_userNotFound_throws() {
        LoginRequest request = new LoginRequest();
        request.setEmail("ghost@example.com");
        request.setPassword("pass");

        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(RuntimeException.class);
    }

    // ---- Logout Test ----

    @Test
    @DisplayName("logout - should blacklist the JWT in Redis")
    void logout_blacklistsToken() {
        String jwt = "some-jwt-token";
        Date futureExpiry = new Date(System.currentTimeMillis() + 60_000);

        when(jwtUtil.extractExpiration(jwt)).thenReturn(futureExpiry);

        authService.logout(jwt);

        verify(redisTokenService).blacklistToken(eq(jwt), longThat(ms -> ms > 0 && ms <= 60_000));
    }

    // ---- Reset Password Tests ----

    @Test
    @DisplayName("resetPassword - should update password when token is valid")
    void resetPassword_success() {
        when(redisTokenService.getEmailByPasswordResetToken("ABCD1234")).thenReturn("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode("newPassword")).thenReturn("new-encoded");

        authService.resetPassword("ABCD1234", "newPassword");

        assertThat(testUser.getPassword()).isEqualTo("new-encoded");
        verify(userRepository).save(testUser);
        verify(redisTokenService).deletePasswordResetToken("ABCD1234");
    }

    @Test
    @DisplayName("resetPassword - should throw when token is invalid/expired")
    void resetPassword_invalidToken_throws() {
        when(redisTokenService.getEmailByPasswordResetToken("EXPIRED")).thenReturn(null);

        assertThatThrownBy(() -> authService.resetPassword("EXPIRED", "newPass"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Invalid or expired token");
    }
}
