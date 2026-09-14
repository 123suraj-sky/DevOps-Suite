package com.devopssuite.logging.filter;

import com.devopssuite.logging.event.LogEvent;
import com.devopssuite.metrics.AppMetrics;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RequestLoggingFilterTest {

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private AppMetrics appMetrics;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private RequestLoggingFilter filter;

    @Test
    void doFilterInternal_populatesTraceIdAndSeverity() throws ServletException, IOException {
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/projects");
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(response.getStatus()).thenReturn(200);

        filter.doFilterInternal(request, response, filterChain);

        verify(response).setHeader(eq("X-Trace-Id"), anyString());
        ArgumentCaptor<LogEvent> captor = ArgumentCaptor.forClass(LogEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());

        LogEvent event = captor.getValue();
        assertThat(event.level()).isEqualTo("INFO");
        assertThat(event.traceId()).isNotBlank();
        assertThat(event.clientIp()).isEqualTo("127.0.0.1");
        assertThat(event.userAgent()).isEqualTo("Mozilla/5.0");
        assertThat(event.eventType()).isEqualTo("HTTP");
    }

    @Test
    void doFilterInternal_with500Status_setsLevelError() throws ServletException, IOException {
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/tasks");
        when(request.getRemoteAddr()).thenReturn("192.168.1.1");
        when(response.getStatus()).thenReturn(500);
        when(request.getAttribute("log_error_message")).thenReturn("Database connection failed");
        when(request.getAttribute("log_error_class")).thenReturn("SQLException");

        filter.doFilterInternal(request, response, filterChain);

        ArgumentCaptor<LogEvent> captor = ArgumentCaptor.forClass(LogEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());

        LogEvent event = captor.getValue();
        assertThat(event.level()).isEqualTo("ERROR");
        assertThat(event.errorMessage()).isEqualTo("Database connection failed");
        assertThat(event.errorClass()).isEqualTo("SQLException");
    }

    @Test
    void doFilterInternal_preservesIncomingTraceId() throws ServletException, IOException {
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/status");
        when(request.getHeader("X-Trace-Id")).thenReturn("custom-trace-123");
        when(response.getStatus()).thenReturn(200);

        filter.doFilterInternal(request, response, filterChain);

        verify(response).setHeader("X-Trace-Id", "custom-trace-123");
        ArgumentCaptor<LogEvent> captor = ArgumentCaptor.forClass(LogEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());

        assertThat(captor.getValue().traceId()).isEqualTo("custom-trace-123");
    }
}
