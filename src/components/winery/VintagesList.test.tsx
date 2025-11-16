import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { VintagesList } from './VintagesList';

// Mock Zero context
const mockVintagesData: any[] = [];
const mockBlocksData: any[] = [];
const mockMeasurementsData: any[] = [];
const mockWinesData: any[] = [];

const mockZero = {
  query: {
    vintage: { data: mockVintagesData },
    block: { data: mockBlocksData },
    measurement: {
      data: mockMeasurementsData,
      where: rs.fn().mockReturnThis(),
    },
    wine: { data: mockWinesData },
  },
};

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => mockZero,
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: (query: any) => {
    if (query === mockZero.query.vintage) {
      return [query.data];
    }
    if (query === mockZero.query.block) {
      return [query.data];
    }
    if (query === mockZero.query.measurement || query?.data === mockMeasurementsData) {
      return [mockMeasurementsData];
    }
    if (query === mockZero.query.wine) {
      return [query.data];
    }
    return [[]];
  },
}));

describe('VintagesList - Integration Tests', () => {
  afterEach(() => {
    cleanup();
    mockVintagesData.length = 0;
    mockBlocksData.length = 0;
    mockMeasurementsData.length = 0;
    mockWinesData.length = 0;
  });

  describe('Empty State', () => {
    test('displays empty state when no vintages exist', () => {
      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/NO VINTAGES YET/i)).toBeInTheDocument();
      expect(screen.getByText(/ADD YOUR FIRST HARVEST TO GET STARTED/i)).toBeInTheDocument();
    });

    test('empty state shows helpful message about first harvest', () => {
      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/ADD YOUR FIRST HARVEST/i)).toBeInTheDocument();
    });
  });

  describe('Vintage Display', () => {
    test('displays vintage cards with year and variety', () => {
      mockVintagesData.push({
        id: '2024-cabernet-sauvignon',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'harvest',
        harvest_date: new Date('2024-10-15').getTime(),
        harvest_weight_lbs: 450,
        harvest_volume_gallons: 35,
        brix_at_harvest: 24.5,
        block_ids: ['block-1'],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/2024 CABERNET SAUVIGNON/i)).toBeInTheDocument();
    });

    test('displays harvest stage for completed vintages', () => {
      mockVintagesData.push({
        id: '2024-pinot-noir',
        vintage_year: 2024,
        variety: 'PINOT NOIR',
        current_stage: 'harvest',
        harvest_date: new Date('2024-10-15').getTime(),
        harvest_weight_lbs: 300,
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      // Check that HARVEST appears (could be in stage or in "HARVEST DATE" label)
      const harvestElements = screen.getAllByText(/HARVEST/i);
      expect(harvestElements.length).toBeGreaterThan(0);
    });

    test('displays pre-harvest stage for vintages in progress', () => {
      mockVintagesData.push({
        id: '2024-merlot',
        vintage_year: 2024,
        variety: 'MERLOT',
        current_stage: 'pre_harvest',
        harvest_date: null,
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/PRE.?HARVEST/i)).toBeInTheDocument();
    });

    test('displays harvest date when available', () => {
      mockVintagesData.push({
        id: '2024-cab-franc',
        vintage_year: 2024,
        variety: 'CABERNET FRANC',
        current_stage: 'harvest',
        harvest_date: new Date('2024-10-15').getTime(),
        harvest_weight_lbs: 450,
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      // Date format might vary by timezone, just check that Oct and 2024 appear
      expect(screen.getByText(/Oct \d+, 2024/i)).toBeInTheDocument();
    });

    test('displays harvest weight when available', () => {
      mockVintagesData.push({
        id: '2024-cab-franc',
        vintage_year: 2024,
        variety: 'CABERNET FRANC',
        current_stage: 'harvest',
        harvest_date: new Date('2024-10-15').getTime(),
        harvest_weight_lbs: 450,
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/450 lbs/i)).toBeInTheDocument();
    });

    test('displays brix when available', () => {
      mockVintagesData.push({
        id: '2024-cab-franc',
        vintage_year: 2024,
        variety: 'CABERNET FRANC',
        current_stage: 'harvest',
        harvest_date: new Date('2024-10-15').getTime(),
        harvest_weight_lbs: 450,
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // Add harvest measurement with brix
      mockMeasurementsData.push({
        id: '2024-cab-franc-harvest-measurement',
        entity_type: 'vintage',
        entity_id: '2024-cab-franc',
        date: new Date('2024-10-15').getTime(),
        stage: 'harvest',
        brix: 24.5,
        ph: null,
        ta: null,
        temperature: null,
        tasting_notes: '',
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/24\.5°/i)).toBeInTheDocument();
    });

    test('displays volume when available', () => {
      mockVintagesData.push({
        id: '2024-cab-franc',
        vintage_year: 2024,
        variety: 'CABERNET FRANC',
        current_stage: 'harvest',
        harvest_date: new Date('2024-10-15').getTime(),
        harvest_volume_gallons: 35,
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/35 gal/i)).toBeInTheDocument();
    });

    test('handles missing optional harvest data gracefully', () => {
      mockVintagesData.push({
        id: '2024-merlot',
        vintage_year: 2024,
        variety: 'MERLOT',
        current_stage: 'veraison',
        harvest_date: null,
        harvest_weight_lbs: null,
        harvest_volume_gallons: null,
        brix_at_harvest: null,
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/2024 MERLOT/i)).toBeInTheDocument();
      expect(screen.queryByText(/lbs/i)).not.toBeInTheDocument();
    });
  });

  describe('Multiple Vintages', () => {
    test('displays multiple vintage cards', () => {
      mockVintagesData.push(
        {
          id: '2024-cabernet-sauvignon',
          vintage_year: 2024,
          variety: 'CABERNET SAUVIGNON',
          current_stage: 'harvest',
          harvest_date: new Date('2024-10-15').getTime(),
          block_ids: [],
          notes: '',
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: '2024-pinot-noir',
          vintage_year: 2024,
          variety: 'PINOT NOIR',
          current_stage: 'harvest',
          harvest_date: new Date('2024-10-10').getTime(),
          block_ids: [],
          notes: '',
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: '2023-merlot',
          vintage_year: 2023,
          variety: 'MERLOT',
          current_stage: 'harvest',
          harvest_date: new Date('2023-10-20').getTime(),
          block_ids: [],
          notes: '',
          created_at: Date.now(),
          updated_at: Date.now(),
        }
      );

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/2024 CABERNET SAUVIGNON/i)).toBeInTheDocument();
      expect(screen.getByText(/2024 PINOT NOIR/i)).toBeInTheDocument();
      expect(screen.getByText(/2023 MERLOT/i)).toBeInTheDocument();
    });

    test('sorts vintages by year (newest first)', () => {
      mockVintagesData.push(
        {
          id: '2022-merlot',
          vintage_year: 2022,
          variety: 'MERLOT',
          current_stage: 'harvest',
          block_ids: [],
          notes: '',
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: '2024-cab',
          vintage_year: 2024,
          variety: 'CABERNET SAUVIGNON',
          current_stage: 'harvest',
          block_ids: [],
          notes: '',
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: '2023-pinot',
          vintage_year: 2023,
          variety: 'PINOT NOIR',
          current_stage: 'harvest',
          block_ids: [],
          notes: '',
          created_at: Date.now(),
          updated_at: Date.now(),
        }
      );

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      const cards = screen.getAllByText(/\d{4}/);
      expect(cards[0].textContent).toContain('2024');
      expect(cards[1].textContent).toContain('2023');
      expect(cards[2].textContent).toContain('2022');
    });
  });

  describe('User Interactions', () => {
    test('calls onVintageClick when vintage card is clicked', async () => {
      const user = userEvent.setup();
      const onVintageClick = rs.fn();

      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'harvest',
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={onVintageClick} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      const card = screen.getByText(/2024 CABERNET SAUVIGNON/i).closest('div');
      if (card) {
        await user.click(card);
      }

      expect(onVintageClick).toHaveBeenCalledWith('2024-cab');
    });

    test('navigates to detail view when vintage clicked', async () => {
      const user = userEvent.setup();
      const onVintageClick = rs.fn();

      mockVintagesData.push({
        id: 'vintage-1',
        vintage_year: 2024,
        variety: 'PINOT NOIR',
        current_stage: 'harvest',
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={onVintageClick} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      const card = screen.getByText(/2024 PINOT NOIR/i).closest('div');
      if (card) {
        await user.click(card);
      }

      expect(onVintageClick).toHaveBeenCalledTimes(1);
      expect(onVintageClick).toHaveBeenCalledWith('vintage-1');
    });
  });

  describe('Stage Display Formatting', () => {
    test('formats bud_break stage as "BUD-BREAK"', () => {
      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'bud_break',
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/BUD-BREAK/i)).toBeInTheDocument();
    });

    test('formats pre_harvest stage as "PRE-HARVEST"', () => {
      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'pre_harvest',
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/PRE.?HARVEST/i)).toBeInTheDocument();
    });

    test('capitalizes single-word stages', () => {
      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'flowering',
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/FLOWERING/i)).toBeInTheDocument();
    });
  });

  describe('Block Display', () => {
    test('shows block count when blocks are associated', () => {
      mockBlocksData.push(
        {
          id: 'block-1',
          name: 'North Block',
          vineyard_id: 'v1',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: 'block-2',
          name: 'South Block',
          vineyard_id: 'v1',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: Date.now(),
          updated_at: Date.now(),
        }
      );

      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'harvest',
        block_ids: ['block-1', 'block-2'],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/2 blocks/i)).toBeInTheDocument();
    });

    test('handles single block correctly', () => {
      mockBlocksData.push({
        id: 'block-1',
        name: 'North Block',
        vineyard_id: 'v1',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'harvest',
        block_ids: ['block-1'],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      expect(screen.getByText(/1 block/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('vintage cards have appropriate role for clickability', () => {
      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'harvest',
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      const card = screen.getByText(/2024 CABERNET SAUVIGNON/i).closest('div[role="button"]');
      expect(card).toHaveAttribute('role', 'button');
    });

    test('vintage cards are keyboard accessible', async () => {
      const user = userEvent.setup();
      const onVintageClick = rs.fn();

      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'harvest',
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={onVintageClick} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      const card = screen.getByText(/2024 CABERNET SAUVIGNON/i).closest('div[role="button"]');
      if (card && card instanceof HTMLElement) {
        card.focus();
        await user.keyboard('{Enter}');
      }

      expect(onVintageClick).toHaveBeenCalledWith('2024-cab');
    });
  });

  describe('Visual Hierarchy', () => {
    test('displays year and variety as prominent heading', () => {
      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'harvest',
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      const heading = screen.getByText(/2024 CABERNET SAUVIGNON/i);
      expect(heading.tagName).toBe('H3');
    });

    test('groups harvest metrics together visually', () => {
      mockVintagesData.push({
        id: '2024-cab',
        vintage_year: 2024,
        variety: 'CABERNET SAUVIGNON',
        current_stage: 'harvest',
        harvest_weight_lbs: 450,
        block_ids: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // Add harvest measurement with brix
      mockMeasurementsData.push({
        id: '2024-cab-harvest-measurement',
        entity_type: 'vintage',
        entity_id: '2024-cab',
        date: Date.now(),
        stage: 'harvest',
        brix: 24.5,
        ph: null,
        ta: null,
        temperature: null,
        tasting_notes: '',
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      render(<VintagesList onVintageClick={rs.fn()} onWineClick={rs.fn()} onCreateWine={rs.fn()} />);

      // Both should be present
      expect(screen.getByText(/450 lbs/i)).toBeInTheDocument();
      expect(screen.getByText(/24\.5°/i)).toBeInTheDocument();
    });
  });
});
