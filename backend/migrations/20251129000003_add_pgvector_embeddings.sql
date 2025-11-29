-- Enable pgvector extension for vector similarity search
-- Note: Railway Postgres supports pgvector out of the box
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store document embeddings for RAG
CREATE TABLE IF NOT EXISTS doc_embeddings (
    id TEXT PRIMARY KEY,
    source_path TEXT NOT NULL,          -- e.g., "knowledgebase/training/vsp.md"
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,              -- The actual text chunk
    embedding vector(1536),             -- OpenAI text-embedding-3-small dimension
    metadata JSONB,                     -- category, tags, etc.
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,

    UNIQUE(source_path, chunk_index)
);

-- IVFFlat index for fast similarity search
-- Note: This index is created after data is inserted for best performance
-- For now, create a basic index; we can recreate with more lists after populating
CREATE INDEX IF NOT EXISTS doc_embeddings_embedding_idx
ON doc_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for filtering by source path
CREATE INDEX IF NOT EXISTS doc_embeddings_source_path_idx ON doc_embeddings(source_path);

-- Index for metadata queries
CREATE INDEX IF NOT EXISTS doc_embeddings_metadata_idx ON doc_embeddings USING gin(metadata);
