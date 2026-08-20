package com.devopssuite.config;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest_client.RestClientTransport;
import org.apache.http.HttpHost;
import org.elasticsearch.client.RestClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Creates an {@link ElasticsearchClient} bean for log indexing.
 * Host/port come from application.yml (elasticsearch.host / elasticsearch.port),
 * which in turn resolve from ELASTICSEARCH_HOST / ELASTICSEARCH_PORT env vars.
 */
@Configuration
public class ElasticsearchConfig {

    @Value("")
    private String host;

    @Value("")
    private int port;

    @Bean
    public ElasticsearchClient elasticsearchClient() {
        RestClient restClient = RestClient.builder(new HttpHost(host, port)).build();
        ElasticsearchTransport transport = new RestClientTransport(restClient, new JacksonJsonpMapper());
        return new ElasticsearchClient(transport);
    }
}
