-- AI Multilingual Prescription Assistant
-- Run this in your cloud provider's SQL editor (Neon, Supabase, etc.)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS prescriptions (
    id          VARCHAR(36)  PRIMARY KEY,
    patient_name TEXT         NOT NULL,
    original_text TEXT        NOT NULL,
    simplified_text TEXT      NOT NULL,
    original_language TEXT    NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at DESC);
