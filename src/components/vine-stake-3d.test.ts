import { test, describe, expect } from '@rstest/core';
import { generate3MF } from './vine-stake-3d';

describe('vine-stake-3d', () => {
  describe('generate3MF', () => {
    test('generates a Blob for a simple vine URL', async () => {
      const vineUrl = 'http://localhost:3000/vines/test-001';

      const result = await generate3MF(vineUrl);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/octet-stream');
    });

    test('generates a Blob for a vine URL with block ID', async () => {
      const vineUrl = 'http://localhost:3000/vines/block-1-001';

      const result = await generate3MF(vineUrl);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });

    test('generates a Blob for a long vine URL', async () => {
      const vineUrl = 'https://example.com/vineyard/my-vineyard/block/north-block/vine/001';

      const result = await generate3MF(vineUrl);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });

    test('generates a Blob for a short vine ID', async () => {
      const vineUrl = 'test';

      const result = await generate3MF(vineUrl);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });

    test('generates different blobs for different URLs', async () => {
      const url1 = 'http://localhost:3000/vines/001';
      const url2 = 'http://localhost:3000/vines/002';

      const blob1 = await generate3MF(url1);
      const blob2 = await generate3MF(url2);

      // Different URLs should generate different QR codes (and thus different blobs)
      expect(blob1.size).not.toBe(blob2.size);
    });

    test('generates consistent blobs for same URL', async () => {
      const vineUrl = 'http://localhost:3000/vines/consistent-test';

      const blob1 = await generate3MF(vineUrl);
      const blob2 = await generate3MF(vineUrl);

      // Same URL should generate same size blob
      expect(blob1.size).toBe(blob2.size);
      expect(blob1.type).toBe(blob2.type);
    });

    test('generates blob with special characters in URL', async () => {
      const vineUrl = 'http://localhost:3000/vines/block-é-001';

      const result = await generate3MF(vineUrl);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });

    test('generates blob with numeric vine ID', async () => {
      const vineUrl = '12345';

      const result = await generate3MF(vineUrl);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });

    test('generates blob for URL with query parameters', async () => {
      const vineUrl = 'http://localhost:3000/vines/001?tracking=true&source=qr';

      const result = await generate3MF(vineUrl);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });

    test('generates blob for HTTPS URL', async () => {
      const vineUrl = 'https://secure.example.com/vines/001';

      const result = await generate3MF(vineUrl);

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });
  });
});
