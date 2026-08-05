package com.devopssuite.monolith.project.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "columns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Column {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @jakarta.persistence.Column(name = "board_id", nullable = false)
    private UUID boardId;

    @jakarta.persistence.Column(nullable = false)
    private String name;

    @jakarta.persistence.Column(name = "color_hex")
    private String colorHex;

    @jakarta.persistence.Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @jakarta.persistence.Column(name = "wip_limit")
    private int wipLimit;

    @CreationTimestamp
    @jakarta.persistence.Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @jakarta.persistence.Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
