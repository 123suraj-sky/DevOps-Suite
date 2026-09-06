package com.devopssuite.project.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable audit record written on every task mutation.
 * snapshot is a free-form JSON string capturing the full task state at that moment.
 */
@Entity
@Table(name = "task_audit_history")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskAuditHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "task_id", nullable = false)
    private UUID taskId;

    /** The user who triggered the change. Nullable — null means system/migration. */
    @Column(name = "changed_by")
    private UUID changedBy;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    /** CREATED | UPDATED | STATUS_CHANGED | DUPLICATED */
    @Column(name = "action", nullable = false, length = 32)
    private String action;

    /**
     * Full JSON snapshot of the task at the moment of this change.
     * Stored as JSONB in Postgres for queryability.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot", nullable = false, columnDefinition = "jsonb")
    private String snapshot;
}
