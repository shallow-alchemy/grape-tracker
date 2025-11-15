import { test, describe, expect } from '@rstest/core';
import {
  validateVineForm,
  calculateAge,
  generateVineId,
  generateBatchVineIds,
  prepareBlockDeletionState,
  transformVineData,
  transformBlockData,
  filterVinesByBlock,
} from './vineyard-utils';
import type { VineDataRaw, BlockDataRaw } from './vineyard-types';

describe('vineyard-utils', () => {
  describe('validateVineForm', () => {
    test('returns no errors for valid form data', () => {
      const validData = {
        block: 'block-1',
        variety: 'Cabernet Sauvignon',
        plantingDate: new Date('2020-01-01'),
        health: 'Good',
      };

      const errors = validateVineForm(validData);

      expect(Object.keys(errors).length).toBe(0);
    });

    test('returns error when block is missing', () => {
      const invalidData = {
        block: '',
        variety: 'Cabernet',
        plantingDate: new Date('2020-01-01'),
        health: 'Good',
      };

      const errors = validateVineForm(invalidData);

      expect(errors.block).toBe('Block is required');
    });

    test('returns error when variety is missing', () => {
      const invalidData = {
        block: 'block-1',
        variety: '',
        plantingDate: new Date('2020-01-01'),
        health: 'Good',
      };

      const errors = validateVineForm(invalidData);

      expect(errors.variety).toBe('Variety is required');
    });

    test('returns error when variety is only whitespace', () => {
      const invalidData = {
        block: 'block-1',
        variety: '   ',
        plantingDate: new Date('2020-01-01'),
        health: 'Good',
      };

      const errors = validateVineForm(invalidData);

      expect(errors.variety).toBe('Variety is required');
    });

    test('returns error when variety is too short', () => {
      const invalidData = {
        block: 'block-1',
        variety: 'A',
        plantingDate: new Date('2020-01-01'),
        health: 'Good',
      };

      const errors = validateVineForm(invalidData);

      expect(errors.variety).toBe('Variety must be at least 2 characters');
    });

    test('returns error when planting date is missing', () => {
      const invalidData = {
        block: 'block-1',
        variety: 'Cabernet',
        plantingDate: null as any,
        health: 'Good',
      };

      const errors = validateVineForm(invalidData);

      expect(errors.plantingDate).toBe('Planting date is required');
    });

    test('returns error when planting date is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidData = {
        block: 'block-1',
        variety: 'Cabernet',
        plantingDate: futureDate,
        health: 'Good',
      };

      const errors = validateVineForm(invalidData);

      expect(errors.plantingDate).toBe('Planting date cannot be in the future');
    });

    test('returns error when health is missing', () => {
      const invalidData = {
        block: 'block-1',
        variety: 'Cabernet',
        plantingDate: new Date('2020-01-01'),
        health: '',
      };

      const errors = validateVineForm(invalidData);

      expect(errors.health).toBe('Health status is required');
    });

    test('returns multiple errors when multiple fields are invalid', () => {
      const invalidData = {
        block: '',
        variety: '',
        plantingDate: null as any,
        health: '',
      };

      const errors = validateVineForm(invalidData);

      expect(Object.keys(errors).length).toBe(4);
      expect(errors.block).toBeDefined();
      expect(errors.variety).toBeDefined();
      expect(errors.plantingDate).toBeDefined();
      expect(errors.health).toBeDefined();
    });
  });

  describe('calculateAge', () => {
    test('calculates age correctly for vines planted this year', () => {
      const plantingDate = new Date();
      plantingDate.setMonth(0);

      const age = calculateAge(plantingDate);

      expect(age).toBe('0 YRS');
    });

    test('calculates age correctly for vines planted 5 years ago', () => {
      const plantingDate = new Date();
      plantingDate.setFullYear(plantingDate.getFullYear() - 5);

      const age = calculateAge(plantingDate);

      expect(age).toBe('5 YRS');
    });

    test('calculates age correctly for vines planted 10 years ago', () => {
      const plantingDate = new Date();
      plantingDate.setFullYear(plantingDate.getFullYear() - 10);

      const age = calculateAge(plantingDate);

      expect(age).toBe('10 YRS');
    });
  });

  describe('generateVineId', () => {
    test('generates first vine ID as 001 when no vines exist', () => {
      const result = generateVineId('block-1', []);

      expect(result.id).toBe('001');
      expect(result.sequenceNumber).toBe(1);
    });

    test('generates next vine ID based on existing vines', () => {
      const existingVines: VineDataRaw[] = [
        { id: '001', sequence_number: 1 } as VineDataRaw,
        { id: '002', sequence_number: 2 } as VineDataRaw,
      ];

      const result = generateVineId('block-1', existingVines);

      expect(result.id).toBe('003');
      expect(result.sequenceNumber).toBe(3);
    });

    test('pads vine ID with leading zeros', () => {
      const existingVines: VineDataRaw[] = [
        { id: '001', sequence_number: 1 } as VineDataRaw,
      ];

      const result = generateVineId('block-1', existingVines);

      expect(result.id).toBe('002');
    });

    test('handles large sequence numbers correctly', () => {
      const existingVines: VineDataRaw[] = [
        { id: '099', sequence_number: 99 } as VineDataRaw,
      ];

      const result = generateVineId('block-1', existingVines);

      expect(result.id).toBe('100');
      expect(result.sequenceNumber).toBe(100);
    });
  });

  describe('generateBatchVineIds', () => {
    test('generates multiple vine IDs starting from 001', () => {
      const result = generateBatchVineIds('block-1', [], 3);

      expect(result.length).toBe(3);
      expect(result[0]).toEqual({ id: '001', sequenceNumber: 1 });
      expect(result[1]).toEqual({ id: '002', sequenceNumber: 2 });
      expect(result[2]).toEqual({ id: '003', sequenceNumber: 3 });
    });

    test('generates batch IDs continuing from existing sequence', () => {
      const existingVines: VineDataRaw[] = [
        { id: '001', sequence_number: 1 } as VineDataRaw,
        { id: '002', sequence_number: 2 } as VineDataRaw,
      ];

      const result = generateBatchVineIds('block-1', existingVines, 2);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ id: '003', sequenceNumber: 3 });
      expect(result[1]).toEqual({ id: '004', sequenceNumber: 4 });
    });

    test('handles quantity of 1', () => {
      const result = generateBatchVineIds('block-1', [], 1);

      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ id: '001', sequenceNumber: 1 });
    });

    test('handles quantity of 0', () => {
      const result = generateBatchVineIds('block-1', [], 0);

      expect(result.length).toBe(0);
    });
  });

  describe('prepareBlockDeletionState', () => {
    test('sets deleteVines to true when no other blocks exist', () => {
      const blocks = [{ id: 'block-1', name: 'Block 1' }] as any[];

      const result = prepareBlockDeletionState('block-1', blocks);

      expect(result.deleteBlockId).toBe('block-1');
      expect(result.deleteMigrateToBlock).toBe(null);
      expect(result.deleteVines).toBe(true);
    });

    test('sets deleteMigrateToBlock when other blocks exist', () => {
      const blocks = [
        { id: 'block-1', name: 'Block 1' },
        { id: 'block-2', name: 'Block 2' },
      ] as any[];

      const result = prepareBlockDeletionState('block-1', blocks);

      expect(result.deleteBlockId).toBe('block-1');
      expect(result.deleteMigrateToBlock).toBe('block-2');
      expect(result.deleteVines).toBe(false);
    });

    test('selects first available block for migration', () => {
      const blocks = [
        { id: 'block-1', name: 'Block 1' },
        { id: 'block-2', name: 'Block 2' },
        { id: 'block-3', name: 'Block 3' },
      ] as any[];

      const result = prepareBlockDeletionState('block-2', blocks);

      expect(result.deleteMigrateToBlock).toBe('block-1');
    });
  });

  describe('transformVineData', () => {
    test('transforms raw vine data to VineData format', () => {
      const rawVine: VineDataRaw = {
        id: '001',
        block: 'North Block',
        sequence_number: 1,
        variety: 'Cabernet Sauvignon',
        planting_date: new Date('2020-01-01'),
        health: 'Good',
        notes: 'Test notes',
        qr_generated: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = transformVineData(rawVine);

      expect(result.id).toBe('001');
      expect(result.block).toBe('North Block');
      expect(result.variety).toBe('Cabernet Sauvignon');
      expect(result.plantingDate).toBeInstanceOf(Date);
      expect(result.age).toMatch(/\d+ YRS/);
      expect(result.health).toBe('Good');
      expect(result.notes).toBe('Test notes');
      expect(result.qrGenerated).toBe(true);
    });

    test('handles missing notes', () => {
      const rawVine: VineDataRaw = {
        id: '001',
        block: 'North Block',
        sequence_number: 1,
        variety: 'Pinot Noir',
        planting_date: new Date('2020-01-01'),
        health: 'Excellent',
        notes: null as any,
        qr_generated: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = transformVineData(rawVine);

      expect(result.notes).toBe('');
    });

    test('sets qrGenerated to false when qr_generated is 0', () => {
      const rawVine: VineDataRaw = {
        id: '001',
        block: 'North Block',
        sequence_number: 1,
        variety: 'Pinot Noir',
        planting_date: new Date('2020-01-01'),
        health: 'Excellent',
        notes: '',
        qr_generated: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = transformVineData(rawVine);

      expect(result.qrGenerated).toBe(false);
    });

    test('sets qrGenerated to true when qr_generated is greater than 0', () => {
      const rawVine: VineDataRaw = {
        id: '001',
        block: 'North Block',
        sequence_number: 1,
        variety: 'Pinot Noir',
        planting_date: new Date('2020-01-01'),
        health: 'Excellent',
        notes: '',
        qr_generated: 5,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = transformVineData(rawVine);

      expect(result.qrGenerated).toBe(true);
    });
  });

  describe('transformBlockData', () => {
    test('transforms raw block data to BlockData format', () => {
      const rawBlock: BlockDataRaw = {
        id: 'block-1',
        vineyard_id: 'vineyard-1',
        name: 'North Block',
        location: 'North hillside',
        size_acres: 5.5,
        soil_type: 'Clay loam',
        notes: 'Excellent drainage',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = transformBlockData(rawBlock);

      expect(result.id).toBe('block-1');
      expect(result.name).toBe('North Block');
      expect(result.location).toBe('North hillside');
      expect(result.sizeAcres).toBe(5.5);
      expect(result.soilType).toBe('Clay loam');
      expect(result.notes).toBe('Excellent drainage');
    });

    test('handles all block fields correctly', () => {
      const rawBlock: BlockDataRaw = {
        id: 'block-2',
        vineyard_id: 'vineyard-1',
        name: 'South Block',
        location: 'South valley',
        size_acres: 3.2,
        soil_type: 'Sandy',
        notes: 'Needs irrigation',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = transformBlockData(rawBlock);

      expect(result).toEqual({
        id: 'block-2',
        name: 'South Block',
        location: 'South valley',
        sizeAcres: 3.2,
        soilType: 'Sandy',
        notes: 'Needs irrigation',
      });
    });
  });

  describe('filterVinesByBlock', () => {
    const mockVines: VineDataRaw[] = [
      { id: '001', block: 'block-1' } as VineDataRaw,
      { id: '002', block: 'block-1' } as VineDataRaw,
      { id: '003', block: 'block-2' } as VineDataRaw,
      { id: '004', block: 'block-2' } as VineDataRaw,
      { id: '005', block: 'block-3' } as VineDataRaw,
    ];

    test('returns all vines when blockId is null', () => {
      const result = filterVinesByBlock(mockVines, null);

      expect(result.length).toBe(5);
      expect(result).toEqual(mockVines);
    });

    test('filters vines by block ID', () => {
      const result = filterVinesByBlock(mockVines, 'block-1');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('001');
      expect(result[1].id).toBe('002');
    });

    test('returns empty array when no vines match block', () => {
      const result = filterVinesByBlock(mockVines, 'block-999');

      expect(result.length).toBe(0);
    });

    test('handles empty vines array', () => {
      const result = filterVinesByBlock([], 'block-1');

      expect(result.length).toBe(0);
    });
  });
});
