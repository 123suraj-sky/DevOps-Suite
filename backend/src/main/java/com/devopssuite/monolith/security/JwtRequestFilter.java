package com.devopssuite.monolith.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class JwtRequestFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    @Value("${project.security.mock-user.enabled:false}")
    private boolean mockUserEnabled;

    @Value("${project.security.mock-user.id:00000000-0000-0000-0000-000000000001}")
    private String mockUserId;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Fallback: Check local Authorization header (e.g. Bearer token)
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtils.validateToken(token)) {
                try {
                    Claims claims = jwtUtils.getClaimsFromToken(token);
                    String userId = claims.getSubject();
                    String rolesStr = claims.get("roles", String.class);
                    List<SimpleGrantedAuthority> authorities = Collections.emptyList();
                    if (rolesStr != null && !rolesStr.trim().isEmpty()) {
                        authorities = Arrays.stream(rolesStr.split(","))
                                .map(role -> new SimpleGrantedAuthority(role.trim()))
                                .collect(Collectors.toList());
                    }

                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userId, null, authorities);
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } catch (Exception e) {
                    // Token parsing failure
                }
            }
        } else if (mockUserEnabled) {
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    mockUserId, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_MEMBER")));
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
