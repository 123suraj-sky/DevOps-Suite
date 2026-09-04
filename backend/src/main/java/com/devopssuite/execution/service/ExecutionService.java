package com.devopssuite.execution.service;

import com.devopssuite.execution.config.ExecutionProperties;
import com.devopssuite.execution.dto.ExecutionDto.*;
import com.devopssuite.execution.model.ExecutionRequest;
import com.devopssuite.execution.model.Language;
import com.devopssuite.execution.repository.ExecutionRequestRepository;
import com.devopssuite.execution.repository.ExecutionResultRepository;
import com.devopssuite.execution.repository.LanguageRepository;
import com.devopssuite.ide.model.IdeFile;
import com.devopssuite.ide.service.IdeFileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExecutionService {

    private final LanguageRepository languageRepository;
    private final ExecutionRequestRepository requestRepository;
    private final ExecutionResultRepository resultRepository;
    private final ExecutionProperties props;
    private final IdeFileService ideFileService;

    // In-memory queue shared with the worker pool
    private final BlockingQueue<UUID> executionQueue = new LinkedBlockingQueue<>();

    /**
     * Language alias map — normalises user-supplied names to DB canonical names.
     * e.g. "python3" → "python", "node" → "javascript", "c++" → "cpp"
     */
    private static final Map<String, String> LANGUAGE_ALIASES = Map.of(
            "python3", "python",
            "node",    "javascript",
            "c++",     "cpp"
    );

    public BlockingQueue<UUID> getExecutionQueue() {
        return executionQueue;
    }

    @Transactional
    public SubmitResponse submitExecution(SubmitRequest request, UUID userId) {

        final String resolvedSourceCode;
        final String resolvedLanguageName;
        final UUID resolvedFileId;

        if (request.getFileId() != null) {
            // ── IDE mode: load the file from DB ──────────────────────────────────
            IdeFile targetFile = ideFileService.getFileEntityInternal(request.getFileId());

            if (targetFile.isFolder()) {
                throw new IllegalArgumentException("Cannot execute a folder entry.");
            }

            resolvedSourceCode   = targetFile.getContent();
            resolvedFileId       = targetFile.getId();

            // Language can be overridden by the request; otherwise use the file's stored lang
            String rawLang = (request.getLanguage() != null && !request.getLanguage().isBlank())
                    ? request.getLanguage().trim().toLowerCase()
                    : targetFile.getLanguage().trim().toLowerCase();
            resolvedLanguageName = LANGUAGE_ALIASES.getOrDefault(rawLang, rawLang);

        } else {
            // ── Classic mode: inline source code ─────────────────────────────────
            if (request.getSourceCode() == null || request.getSourceCode().isBlank()) {
                throw new IllegalArgumentException(
                        "Either source_code or file_id must be provided.");
            }
            if (request.getLanguage() == null || request.getLanguage().isBlank()) {
                throw new IllegalArgumentException(
                        "language is required when submitting inline source_code.");
            }

            resolvedSourceCode   = request.getSourceCode();
            resolvedFileId       = null;
            String rawLang       = request.getLanguage().trim().toLowerCase();
            resolvedLanguageName = LANGUAGE_ALIASES.getOrDefault(rawLang, rawLang);
        }

        // Validate source code size
        if (resolvedSourceCode.isBlank()) {
            throw new IllegalArgumentException("Source code must not be empty.");
        }
        if (resolvedSourceCode.length() > props.getMaxCodeSizeBytes()) {
            throw new IllegalArgumentException(
                    "Source code exceeds maximum allowed size of " + props.getMaxCodeSizeBytes() + " bytes.");
        }
        if (request.getStdin() != null && request.getStdin().length() > props.getMaxStdinSizeBytes()) {
            throw new IllegalArgumentException(
                    "Stdin exceeds maximum allowed size of " + props.getMaxStdinSizeBytes() + " bytes.");
        }

        // Resolve Language entity from DB
        Language language = languageRepository.findByNameIgnoreCase(resolvedLanguageName)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unsupported language: '" + resolvedLanguageName + "'. " +
                        "Supported: python, javascript, java, cpp (and aliases python3, node, c++)."));

        if (!language.isEnabled()) {
            throw new IllegalArgumentException(
                    "Language '" + language.getName() + "' is currently disabled.");
        }

        // Clamp time/memory to language ceiling
        int maxTime = clamp(
                request.getMaxTimeMs() != null ? request.getMaxTimeMs() : language.getMaxExecutionTimeMs(),
                1, Math.min(language.getMaxExecutionTimeMs(), props.getTimeout()));
        int maxMem = clamp(
                request.getMaxMemoryMb() != null ? request.getMaxMemoryMb() : language.getMaxMemoryMb(),
                16, language.getMaxMemoryMb());

        ExecutionRequest execRequest = ExecutionRequest.builder()
                .userId(userId)
                .language(language)
                .sourceCode(resolvedSourceCode)
                .stdin(request.getStdin())
                .maxTimeMs(maxTime)
                .maxMemoryMb(maxMem)
                .fileId(resolvedFileId)
                .status("QUEUED")
                .build();

        ExecutionRequest saved = requestRepository.saveAndFlush(execRequest);
        executionQueue.offer(saved.getId());

        log.info("Queued execution request {} (language={}, mode={}, user={})",
                saved.getId(), resolvedLanguageName,
                resolvedFileId != null ? "ide" : "classic", userId);

        return SubmitResponse.builder()
                .executionId(saved.getId())
                .status(saved.getStatus())
                .build();
    }

    @Transactional(readOnly = true)
    public QueryResponse getResult(UUID executionId) {
        ExecutionRequest request = requestRepository.findById(executionId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Execution request not found: " + executionId));

        QueryResponse.QueryResponseBuilder builder = QueryResponse.builder()
                .executionId(request.getId())
                .status(request.getStatus());

        boolean isTerminal = isTerminalStatus(request.getStatus());
        if (isTerminal) {
            resultRepository.findByRequestId(request.getId()).ifPresent(res -> {
                builder.stdout(res.getStdout())
                        .stderr(res.getStderr())
                        .exitCode(res.getExitCode())
                        .executionTimeMs(res.getExecutionTimeMs())
                        .memoryUsedKb(res.getMemoryUsedKb())
                        .timedOut(res.isTimedOut())
                        .oomKilled(res.isOomKilled());
            });
        }

        return builder.build();
    }

    /**
     * Returns a paginated list of the caller's past executions (newest first),
     * joined with their result metadata.
     */
    @Transactional(readOnly = true)
    public List<HistoryItem> getHistory(UUID userId, int page, int size) {
        int safeSize = Math.min(size, 100);
        PageRequest pageable = PageRequest.of(page, safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        List<ExecutionRequest> requests =
                requestRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);

        return requests.stream().map(req -> {
            HistoryItem.HistoryItemBuilder item = HistoryItem.builder()
                    .executionId(req.getId())
                    .language(req.getLanguage().getName())
                    .status(req.getStatus())
                    .createdAt(req.getCreatedAt());

            if (isTerminalStatus(req.getStatus())) {
                resultRepository.findByRequestId(req.getId()).ifPresent(res -> {
                    item.exitCode(res.getExitCode())
                        .executionTimeMs(res.getExecutionTimeMs())
                        .timedOut(res.isTimedOut())
                        .oomKilled(res.isOomKilled());
                });
            }
            return item.build();
        }).toList();
    }

    // ── Utilities ────────────────────────────────────────────────────────────────

    private boolean isTerminalStatus(String status) {
        return status != null &&
               (status.equals("COMPLETED") || status.equals("FAILED") ||
                status.equals("TIMEOUT")   || status.equals("OOM_KILLED"));
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
