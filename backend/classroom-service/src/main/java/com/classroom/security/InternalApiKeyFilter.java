package com.classroom.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class InternalApiKeyFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(InternalApiKeyFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        
        // Allow Actuator (health checks via Eureka/Docker) and root paths
        if (path.startsWith("/actuator") || path.equals("/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String expectedKey = System.getenv("INTERNAL_API_KEY");
        if (expectedKey == null || expectedKey.isBlank()) {
            // Fallback for local development when running outside Docker
            expectedKey = ""; 
        }

        String requestKey = request.getHeader("X-Internal-Key");
        if (requestKey == null || !requestKey.equals(expectedKey)) {
            log.warn("Blocked direct access attempt to {} from IP {}", path, request.getRemoteAddr());
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write("Access Denied: Direct access is forbidden. Please route through the API Gateway.");
            return;
        }

        filterChain.doFilter(request, response);
    }
}

