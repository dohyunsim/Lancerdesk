-- Migration 002: Add client_id to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS client_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_id   TEXT NOT NULL DEFAULT '';
