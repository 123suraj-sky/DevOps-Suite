package com.devopssuite.logging.service;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.IndexRequest;
import com.devopssuite.logging.event.LogEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Listens for {@link LogEvent}s and indexes each one as a structured JSON document
 * into Elasticsearch under the index pattern {@code devopssuite-logs-yyyy.MM.dd}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ElasticsearchLogService {

    private static final DateTimeFormatter INDEX_DATE_FMT =
            DateTimeFormatter.ofPattern("yyyy.MM.dd").withZone(ZoneOffset.UTC);

    private final ElasticsearchClient elasticsearchClient;

    @Async
    @EventListener
    public void onLogEvent(LogEvent event) {
        try {
            String indexName = "devopssuite-logs-" + INDEX_DATE_FMT.format(event.timestamp());

            Map<String, Object> doc = new HashMap<>();
            doc.put("method", event.method());
            doc.put("uri", event.uri());
            doc.put("status", event.status());
            doc.put("durationMs", event.durationMs());
            doc.put("userId", event.userId());
            doc.put("projectId", event.projectId() != null ? event.projectId().toString() : null);
            doc.put("timestamp", event.timestamp().toString());

            IndexRequest<Map<String, Object>> request = IndexRequest.of(i -> i
                    .index(indexName)
                    .document(doc)
            );

            elasticsearchClient.index(request);
        } catch (Exception e) {
            // Log at WARN so a missing ES doesn't crash the app
            log.warn("Failed to index log event to Elasticsearch: {}", e.getMessage());
        }
    }
}
