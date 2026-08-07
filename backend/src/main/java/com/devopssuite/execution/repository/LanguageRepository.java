package com.devopssuite.execution.repository;

import com.devopssuite.execution.model.Language;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LanguageRepository extends JpaRepository<Language, UUID> {
    Optional<Language> findByNameIgnoreCase(String name);
}
