package com.devopssuite.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Externalized configuration for the Redis rate-limiting filter.
 *
 * <p>Values can be overridden via environment variables:
 * <pre>
 *   RATE_LIMIT_EXECUTION_MAX=5
 *   RATE_LIMIT_AUTH_MAX=10
 *   RATE_LIMIT_API_MAX=200
 * </pre>
 */
@Component
@ConfigurationProperties(prefix = "rate-limit")
@Getter
@Setter
public class RateLimitProperties {

    /** Duration of the rate-limit window in seconds. Default: 60. */
    private long windowSeconds = 60;

    /** Max requests per window for the code-execution tier. Default: 10. */
    private int executionMax = 10;

    /** Max requests per window for the auth tier (login/register). Default: 20. */
    private int authMax = 20;

    /** Max requests per window for the general API tier. Default: 300. */
    private int apiMax = 300;
}
