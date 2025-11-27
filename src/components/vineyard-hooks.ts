import { useRef } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { myVines, myBlocks, myVineyards, myVintages, myWines, myMeasurements, myTasks } from '../shared/queries';
import { type VineDataRaw, type BlockDataRaw, type VineyardData } from './vineyard-types';

export const useVines = () => {
  const { user } = useUser();
  const [vinesData] = useQuery(myVines(user?.id));
  const lastVinesRef = useRef<VineDataRaw[]>([]);

  // Remember last valid data to prevent flash during Zero reconnection
  if (vinesData && vinesData.length > 0) {
    lastVinesRef.current = vinesData as VineDataRaw[];
  }

  return (vinesData && vinesData.length > 0 ? vinesData : lastVinesRef.current) as VineDataRaw[];
};

export const useBlocks = () => {
  const { user } = useUser();
  const [blocksData] = useQuery(myBlocks(user?.id));
  const lastBlocksRef = useRef<BlockDataRaw[]>([]);

  // Remember last valid data to prevent flash during Zero reconnection
  if (blocksData && blocksData.length > 0) {
    lastBlocksRef.current = blocksData as BlockDataRaw[];
  }

  return (blocksData && blocksData.length > 0 ? blocksData : lastBlocksRef.current) as BlockDataRaw[];
};

export const useVineyard = () => {
  const { user } = useUser();
  const [vineyardData] = useQuery(myVineyards(user?.id));
  const lastVineyardRef = useRef<VineyardData | null>(null);
  const data = vineyardData as VineyardData[];

  // Remember last valid vineyard to prevent flash during Zero reconnection
  if (data.length > 0) {
    lastVineyardRef.current = data[0];
  }

  return data.length > 0 ? data[0] : lastVineyardRef.current;
};
