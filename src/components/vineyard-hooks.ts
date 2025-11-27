import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { myVines, myBlocks, myVineyards } from '../shared/queries';
import { type VineDataRaw, type BlockDataRaw, type VineyardData } from './vineyard-types';

export const useVines = () => {
  const { user } = useUser();
  const [vinesData] = useQuery(myVines(user?.id));
  return vinesData as VineDataRaw[];
};

export const useBlocks = () => {
  const { user } = useUser();
  const [blocksData] = useQuery(myBlocks(user?.id));
  return blocksData as BlockDataRaw[];
};

export const useVineyard = () => {
  const { user } = useUser();
  const [vineyardData] = useQuery(myVineyards(user?.id));
  const data = vineyardData as VineyardData[];
  return data.length > 0 ? data[0] : null;
};
