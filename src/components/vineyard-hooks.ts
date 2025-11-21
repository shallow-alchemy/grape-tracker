import { useQuery } from '@rocicorp/zero/react';
import { myVines, myBlocks, myVineyards } from '../queries';
import { type VineDataRaw, type BlockDataRaw, type VineyardData } from './vineyard-types';

export const useVines = () => {
  const [vinesData] = useQuery(myVines() as any) as any;
  return vinesData as VineDataRaw[];
};

export const useBlocks = () => {
  const [blocksData] = useQuery(myBlocks() as any) as any;
  return blocksData as BlockDataRaw[];
};

export const useVineyard = () => {
  const [vineyardData] = useQuery(myVineyards() as any) as any;
  const data = vineyardData as VineyardData[];
  return data.length > 0 ? data[0] : null;
};
