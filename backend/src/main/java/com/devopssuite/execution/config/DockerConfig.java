package com.devopssuite.execution.config;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientBuilder;
import com.github.dockerjava.core.DockerClientConfig;
import com.github.dockerjava.okhttp.OkDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DockerConfig {

    @Bean
    public DockerClient dockerClient() {
        String os = System.getProperty("os.name").toLowerCase();
        String dockerHost = os.contains("win") ? "npipe:////./pipe/docker_engine" : "unix:///var/run/docker.sock";

        DockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
                .withDockerHost(dockerHost)
                .build();

        // OkHttp handles Unix Domain Sockets natively and reliably in docker-java (using OkDockerHttpClient in 3.4.0)
        DockerHttpClient httpClient = new OkDockerHttpClient.Builder()
                .dockerHost(config.getDockerHost())
                .sslConfig(config.getSSLConfig())
                .connectTimeout(30000)
                .readTimeout(45000)
                .build();

        return DockerClientBuilder.getInstance(config)
                .withDockerHttpClient(httpClient)
                .build();
    }
}
