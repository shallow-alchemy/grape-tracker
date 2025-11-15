import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../contexts/ZeroContext';
import { type VineDataRaw, type BlockDataRaw, type VineyardData } from './vineyard-types';

export const useVines = () => {
  const zero = useZero();
  const [vinesData] = useQuery(zero.query.vine);
  return vinesData as VineDataRaw[];
};

export const useBlocks = () => {
  const zero = useZero();
  const [blocksData] = useQuery(zero.query.block);
  return blocksData as BlockDataRaw[];
};

export const useVineyard = () => {
  const zero = useZero();
  const [vineyardData] = useQuery(zero.query.vineyard);
  const data = vineyardData as VineyardData[];
  return data.length > 0 ? data[0] : null;
};
