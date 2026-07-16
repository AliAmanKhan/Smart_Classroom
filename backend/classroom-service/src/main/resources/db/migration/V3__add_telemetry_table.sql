CREATE TABLE telemetry_xapi_statements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT NOT NULL,
    actor_role VARCHAR(50),
    verb VARCHAR(50) NOT NULL,
    object_type VARCHAR(50) NOT NULL,
    object_id VARCHAR(100),
    classroom_id BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telemetry_classroom_id ON telemetry_xapi_statements(classroom_id);
CREATE INDEX idx_telemetry_actor_id ON telemetry_xapi_statements(actor_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry_xapi_statements(timestamp);
