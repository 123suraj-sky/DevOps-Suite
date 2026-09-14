package com.devopssuite.logging.service;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Queries Elasticsearch for historic log entries associated with a project.
 * Searches across daily rolling indices: {@code devopssuite-logs-*}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LogSearchService {

    private static final String INDEX_PATTERN = "devopssuite-logs-*";

    private final ElasticsearchClient elasticsearchClient;

    /**
     * Returns up to {@code size} log entries for the given project,
     * newest first. If {@code query} is provided, it is matched against the
     * {@code uri} and {@code method} fields.
     *
     * @param projectId required – filters logs to this project
     * @param query     optional free-text filter (matched against uri + method)
     * @param size      max results, capped at 500
     * @return list of log entry maps (method, uri, status, durationMs, userId, projectId, timestamp)
     */
    public List<Map<String, Object>> searchLogs(UUID projectId, String query, int size) {
        int safeSize = Math.min(Math.max(1, size), 500);

        try {
            // Base must-match: projectId term
            List<Query> mustClauses = new ArrayList<>();
            mustClauses.add(Query.of(q -> q
                    .term(t -> t.field("projectId.keyword").value(projectId.toString()))));

            // Optional text filter on uri + method
            if (query != null && !query.isBlank()) {
                String trimmed = query.trim();
                mustClauses.add(Query.of(q -> q
                        .multiMatch(m -> m
                                .query(trimmed)
                                .fields("uri", "method"))));
            }

            BoolQuery boolQuery = BoolQuery.of(b -> b.must(mustClauses));

            SearchRequest searchRequest = SearchRequest.of(s -> s
                    .index(INDEX_PATTERN)
                    .query(q -> q.bool(boolQuery))
                    .sort(so -> so.field(f -> f.field("timestamp").order(SortOrder.Desc)))
                    .size(safeSize)
            );

            SearchResponse<Map> response = elasticsearchClient.search(searchRequest, Map.class);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> results = response.hits().hits().stream()
                    .map(Hit::source)
                    .filter(src -> src != null)
                    .map(src -> (Map<String, Object>) src)
                    .toList();

            return results;

        } catch (Exception e) {
            log.warn("Elasticsearch log search failed for projectId={}: {}", projectId, e.getMessage());
            return List.of();
        }
    }

    /**
     * Queries Elasticsearch for logs triggered by a specific user across all projects.
     *
     * @param userId user identifier (email or UUID)
     * @param query  optional free-text query on uri / method
     * @param size   max records to fetch
     * @return list of log events
     */
    public List<Map<String, Object>> searchUserLogs(String userId, String query, int size) {
        int safeSize = Math.min(Math.max(1, size), 500);

        try {
            List<Query> mustClauses = new ArrayList<>();
            mustClauses.add(Query.of(q -> q
                    .term(t -> t.field("userId.keyword").value(userId))));

            if (query != null && !query.isBlank()) {
                String trimmed = query.trim();
                mustClauses.add(Query.of(q -> q
                        .multiMatch(m -> m
                                .query(trimmed)
                                .fields("uri", "method"))));
            }

            BoolQuery boolQuery = BoolQuery.of(b -> b.must(mustClauses));

            SearchRequest searchRequest = SearchRequest.of(s -> s
                    .index(INDEX_PATTERN)
                    .query(q -> q.bool(boolQuery))
                    .sort(so -> so.field(f -> f.field("timestamp").order(SortOrder.Desc)))
                    .size(safeSize)
            );

            SearchResponse<Map> response = elasticsearchClient.search(searchRequest, Map.class);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> results = response.hits().hits().stream()
                    .map(Hit::source)
                    .filter(src -> src != null)
                    .map(src -> (Map<String, Object>) src)
                    .toList();

            return results;

        } catch (Exception e) {
            log.warn("Elasticsearch user log search failed for userId={}: {}", userId, e.getMessage());
            return List.of();
        }
    }
}
