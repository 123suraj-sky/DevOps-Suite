-- Add Java and C++ language support
INSERT INTO languages (id, name, version, docker_image, file_extension, max_execution_time_ms, max_memory_mb, enabled)
VALUES 
('33333333-3333-3333-3333-333333333333', 'java', '21', 'eclipse-temurin:21-jdk-alpine', 'java', 10000, 512, true),
('44444444-4444-4444-4444-444444444444', 'cpp', 'gcc13', 'gcc:13-alpine', 'cpp', 10000, 256, true)
ON CONFLICT (name) DO NOTHING;

-- Ensure javascript uses Node 24
UPDATE languages SET version = '24', docker_image = 'node:24-alpine' WHERE name = 'javascript';

