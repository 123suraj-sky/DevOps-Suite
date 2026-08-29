# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy pom first and download dependencies separately for layer caching.
# This layer is only invalidated when pom.xml changes, not on every source change.
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source and build the fat jar (skip tests — run them in CI separately)
COPY src ./src
RUN mvn package -DskipTests

# ─── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create sandbox temp directory and give appuser write access
RUN mkdir -p /tmp/devopssuite-sandbox && chown appuser:appgroup /tmp/devopssuite-sandbox

USER appuser

# Copy only the fat jar from the builder stage
COPY --from=builder /app/target/backend-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
