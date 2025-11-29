#!/usr/bin/env npx tsx
/**
 * Embedding CLI Tool for RAG
 *
 * Reads knowledgebase markdown files, chunks them, generates embeddings,
 * and stores them in the doc_embeddings table.
 *
 * Usage: yarn embed-docs [--dry-run] [--force]
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   OPENAI_API_KEY - OpenAI API key for embeddings
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { config } from 'dotenv';

// Load .env file
config();

const KNOWLEDGEBASE_PATH = 'docs/04-product/knowledgebase';
const CHUNK_SIZE = 500; // Target tokens per chunk
const CHUNK_OVERLAP = 50; // Overlap between chunks for context continuity
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

interface DocChunk {
  id: string;
  sourcePath: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
}

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Simple token estimation (roughly 4 chars per token for English)
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Split text into chunks with overlap
const chunkText = (text: string, maxTokens: number, overlapTokens: number): string[] => {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If adding this paragraph exceeds limit, save current chunk and start new
    if (currentTokens + paragraphTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from end of previous
      const words = currentChunk.split(/\s+/);
      const overlapWords = Math.ceil((overlapTokens * 4) / 5); // Approximate words for overlap
      currentChunk = words.slice(-overlapWords).join(' ') + '\n\n' + paragraph;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  // Add final chunk if not empty
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

// Extract metadata from markdown frontmatter and content
const extractMetadata = (content: string, filePath: string): Record<string, unknown> => {
  const metadata: Record<string, unknown> = {
    source: filePath,
  };

  // Extract category from path
  const pathParts = filePath.split('/');
  if (pathParts.length >= 2) {
    metadata.category = pathParts[pathParts.length - 2];
  }

  // Extract title from first H1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    metadata.title = titleMatch[1];
  }

  // Check for specific content types
  if (filePath.includes('training/')) {
    metadata.type = 'training_system';
  } else if (filePath.includes('climate/')) {
    metadata.type = 'climate';
  } else if (filePath.includes('seasonal/')) {
    metadata.type = 'seasonal';
  } else if (filePath.includes('varietals/')) {
    metadata.type = 'varietal';
  } else if (filePath.includes('winemaking/')) {
    metadata.type = 'winemaking';
  } else if (filePath.includes('soil/')) {
    metadata.type = 'soil';
  }

  return metadata;
};

// Recursively get all markdown files
const getMarkdownFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getMarkdownFiles(fullPath)));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
};

// Generate embeddings via OpenAI API
const generateEmbeddings = async (
  texts: string[],
  apiKey: string
): Promise<number[][]> => {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  console.log(`  Embedded ${texts.length} chunks (${data.usage.total_tokens} tokens)`);

  // Sort by index to maintain order
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
};

// Store embeddings in PostgreSQL
const storeEmbeddings = async (
  chunks: DocChunk[],
  embeddings: number[][],
  connectionString: string
): Promise<void> => {
  // Dynamic import for pg since it's a Node.js module
  const { default: pg } = await import('pg');
  const { Client } = pg;

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Clear existing embeddings for these source paths
    const sourcePaths = [...new Set(chunks.map((c) => c.sourcePath))];
    await client.query(
      'DELETE FROM doc_embeddings WHERE source_path = ANY($1)',
      [sourcePaths]
    );

    // Insert new embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      await client.query(
        `INSERT INTO doc_embeddings (id, source_path, chunk_index, content, embedding, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          chunk.id,
          chunk.sourcePath,
          chunk.chunkIndex,
          chunk.content,
          `[${embedding.join(',')}]`,
          JSON.stringify(chunk.metadata),
          Date.now(),
        ]
      );
    }

    console.log(`  Stored ${chunks.length} embeddings in database`);
  } finally {
    await client.end();
  }
};

// Main function
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  console.log('🔍 Embedding Knowledgebase Documents\n');

  // Check environment variables
  const databaseUrl = process.env.DATABASE_URL;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!databaseUrl && !dryRun) {
    console.error('❌ DATABASE_URL environment variable required');
    process.exit(1);
  }

  if (!openaiKey && !dryRun) {
    console.error('❌ OPENAI_API_KEY environment variable required');
    process.exit(1);
  }

  // Find all markdown files
  const files = await getMarkdownFiles(KNOWLEDGEBASE_PATH);
  console.log(`📚 Found ${files.length} markdown files\n`);

  const allChunks: DocChunk[] = [];

  // Process each file
  for (const filePath of files) {
    const relativePath = relative(KNOWLEDGEBASE_PATH, filePath);
    const content = await readFile(filePath, 'utf-8');

    // Chunk the content
    const textChunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);
    const metadata = extractMetadata(content, relativePath);

    console.log(`📄 ${relativePath}: ${textChunks.length} chunks`);

    // Create chunk objects
    for (let i = 0; i < textChunks.length; i++) {
      allChunks.push({
        id: `${relativePath.replace(/[/\\]/g, '_')}_${i}`,
        sourcePath: relativePath,
        chunkIndex: i,
        content: textChunks[i],
        metadata,
      });
    }
  }

  console.log(`\n📊 Total: ${allChunks.length} chunks from ${files.length} files`);

  if (dryRun) {
    console.log('\n🔸 Dry run - not generating or storing embeddings');
    console.log('\nSample chunks:');
    for (const chunk of allChunks.slice(0, 3)) {
      console.log(`\n--- ${chunk.sourcePath} [${chunk.chunkIndex}] ---`);
      console.log(chunk.content.slice(0, 200) + '...');
    }
    return;
  }

  // Generate embeddings in batches (OpenAI allows up to 2048 texts per request)
  console.log('\n🧠 Generating embeddings...');
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);

    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)}`);
    const embeddings = await generateEmbeddings(texts, openaiKey!);
    allEmbeddings.push(...embeddings);

    // Small delay to avoid rate limits
    if (i + BATCH_SIZE < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Store in database
  console.log('\n💾 Storing embeddings in database...');
  await storeEmbeddings(allChunks, allEmbeddings, databaseUrl!);

  console.log('\n✅ Done!');
};

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
