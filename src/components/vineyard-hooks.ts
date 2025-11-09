import { useState, useEffect } from 'react';
import { useZero } from '../contexts/ZeroContext';
import { type VineDataRaw, type BlockDataRaw, type VineyardData } from './vineyard-types';

export const useVines = () => {
  const zero = useZero();
  const [vinesData, setVinesData] = useState<VineDataRaw[]>([]);

  useEffect(() => {
    const loadVines = async () => {
      const result = await zero.query.vine.run();
      setVinesData(result as VineDataRaw[]);
    };
    loadVines();

    const interval = setInterval(loadVines, 1000);
    return () => clearInterval(interval);
  }, [zero]);

  return vinesData;
};

export const useBlocks = () => {
  const zero = useZero();
  const [blocksData, setBlocksData] = useState<BlockDataRaw[]>([]);

  useEffect(() => {
    const loadBlocks = async () => {
      const result = await zero.query.block.run();
      setBlocksData(result as BlockDataRaw[]);
    };
    loadBlocks();

    const interval = setInterval(loadBlocks, 1000);
    return () => clearInterval(interval);
  }, [zero]);

  return blocksData;
};

export const useVineyard = () => {
  const zero = useZero();
  const [vineyardData, setVineyardData] = useState<VineyardData | null>(null);

  useEffect(() => {
    const loadVineyard = async () => {
      const result = await zero.query.vineyard.run();
      if (result.length > 0) {
        setVineyardData(result[0] as VineyardData);
      }
    };
    loadVineyard();

    const interval = setInterval(loadVineyard, 1000);
    return () => clearInterval(interval);
  }, [zero]);

  return vineyardData;
};
