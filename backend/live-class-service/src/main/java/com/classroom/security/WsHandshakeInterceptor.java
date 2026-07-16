package com.classroom.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

/**
 * Validates the JWT token during the WebSocket handshake.
 * The token is expected as a query parameter: ?token=<jwt>
 * On success, the authenticated username is stored in the WebSocket session
 * attributes so that STOMP message handlers can access it.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WsHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        List<String> tokens = UriComponentsBuilder
                .fromUri(request.getURI())
                .build()
                .getQueryParams()
                .get("token");

        if (tokens == null || tokens.isEmpty()) {
            log.warn("WebSocket handshake rejected: no token provided from {}", request.getRemoteAddress());
            return false;
        }

        String token = tokens.get(0);
        if (!jwtUtil.validateToken(token)) {
            log.warn("WebSocket handshake rejected: invalid or expired token from {}", request.getRemoteAddress());
            return false;
        }

        String username = jwtUtil.extractUsername(token);
        attributes.put("username", username);
        log.info("WebSocket handshake accepted for user: {}", username);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // no-op
    }
}
