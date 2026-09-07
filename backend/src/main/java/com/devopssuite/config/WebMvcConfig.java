package com.devopssuite.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Maps the /uploads/avatars/** URL prefix to the Docker volume directory
 * so avatar files can be served as static resources without a separate
 * file-server container.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.avatar.upload-dir:/app/uploads/avatars}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Resolve to an absolute path and add a trailing slash so Spring
        // can enumerate files in the directory.
        String location = "file:" + Paths.get(uploadDir).toAbsolutePath().normalize() + "/";
        registry.addResourceHandler("/uploads/avatars/**")
                .addResourceLocations(location);
    }
}
