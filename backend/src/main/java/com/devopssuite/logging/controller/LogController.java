package com.devopssuite.logging.controller;

import com.devopssuite.logging.service.LogSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for querying historic log entries stored in Elasticsearch.
 *
 * <p>Endpoint: {@code GET /api/logs/search?projectId=&query=&size=}</p>
 *
 * <p>All routes require a valid JWT. Users can only fetch logs for projects
 * they belong to — project membership is enforced by the service layer.</p>
 */
@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogController {

    private final LogSearchService logSearchService;

    /**
     * Search historic logs in Elasticsearch for a given project.
     *
     * @param projectId required – UUID of the project whose logs to retrieve
     * @param query     optional – free-text filter matched against uri + method fields
     * @param size      max number of results (default 50, capped at 500)
     */
    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> searchLogs(
            @RequestParam UUID projectId,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "50") int size) {

        List<Map<String, Object>> logs = logSearchService.searchLogs(projectId, query, size);

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "data", logs
        ));
    }

    /**
     * Returns a distinct list of service names / URIs seen in the project's logs.
     * Useful for populating filter dropdowns in the frontend.
     * Currently returns an empty list as a placeholder — can be enriched later.
     */
    @GetMapping("/services")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getServices(
            @RequestParam UUID projectId) {

        // Placeholder — the frontend uses this to populate a filter dropdown.
        // Returns empty list; can be implemented with ES aggregations later.
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "data", List.of()
        ));
    }
}
