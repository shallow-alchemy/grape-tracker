import { useState, useEffect } from 'react';
import { type Zero } from '@rocicorp/zero';
import { type Schema } from '../../schema';
import { type VineDataRaw, type BlockDataRaw, type VineyardData } from './vineyard-types';

export const useVines = (z: Zero<Schema>) => {
  const [vinesData, setVinesData] = useState<VineDataRaw[]>([]);

  useEffect(() => {
    const loadVines = async () => {
      const result = await z.query.vine.run();
      setVinesData(result as VineDataRaw[]);
    };
    loadVines();

    const interval = setInterval(loadVines, 1000);
    return () => clearInterval(interval);
  }, [z]);

  return vinesData;
};

export const useBlocks = (z: Zero<Schema>) => {
  const [blocksData, setBlocksData] = useState<BlockDataRaw[]>([]);

  useEffect(() => {
    const loadBlocks = async () => {
      const result = await z.query.block.run();
      setBlocksData(result as BlockDataRaw[]);
    };
    loadBlocks();

    const interval = setInterval(loadBlocks, 1000);
    return () => clearInterval(interval);
  }, [z]);

  return blocksData;
};

export const useVineyard = (z: Zero<Schema>) => {
  const [vineyardData, setVineyardData] = useState<VineyardData | null>(null);

  useEffect(() => {
    const loadVineyard = async () => {
      const result = await z.query.vineyard.run();
      if (result.length > 0) {
        setVineyardData(result[0] as VineyardData);
      }
    };
    loadVineyard();

    const interval = setInterval(loadVineyard, 1000);
    return () => clearInterval(interval);
  }, [z]);

  return vineyardData;
};
