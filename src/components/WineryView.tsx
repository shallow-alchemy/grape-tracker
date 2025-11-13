import { FiSettings } from 'react-icons/fi';
import { ListItem } from './ListItem';
import styles from '../App.module.css';

export const WineryView = () => {
  // Hardcoded 10 vintages
  const vintages = [
    { id: '1', year: 2024, name: 'Cab Franc Red', variety: 'Cabernet Franc', type: 'Red', stage: 'Primary Fermentation', volume: 12.5, status: 'Active' },
    { id: '2', year: 2024, name: 'Cab Franc Rosé', variety: 'Cabernet Franc', type: 'Rosé', stage: 'Secondary Fermentation', volume: 8.0, status: 'Active' },
    { id: '3', year: 2024, name: 'Pinot Noir', variety: 'Pinot Noir', type: 'Red', stage: 'Crush', volume: 10.0, status: 'Active' },
    { id: '4', year: 2023, name: 'Pinot Noir', variety: 'Pinot Noir', type: 'Red', stage: 'Aging', volume: 9.8, status: 'Aging' },
    { id: '5', year: 2023, name: 'Chardonnay', variety: 'Chardonnay', type: 'White', stage: 'Oaking', volume: 11.2, status: 'Aging' },
    { id: '6', year: 2023, name: 'Cab Franc Red', variety: 'Cabernet Franc', type: 'Red', stage: 'Racking', volume: 12.0, status: 'Active' },
    { id: '7', year: 2022, name: 'Cab Franc', variety: 'Cabernet Franc', type: 'Red', stage: 'Bottled', volume: 11.0, status: 'Bottled' },
    { id: '8', year: 2022, name: 'Pinot Noir', variety: 'Pinot Noir', type: 'Red', stage: 'Bottled', volume: 9.5, status: 'Bottled' },
    { id: '9', year: 2022, name: 'Blend "Autumn"', variety: 'Blend', type: 'Red', stage: 'Bottled', volume: 8.0, status: 'Bottled' },
    { id: '10', year: 2021, name: 'Cab Franc', variety: 'Cabernet Franc', type: 'Red', stage: 'Bottled', volume: 10.5, status: 'Bottled' },
  ];

  return (
    <div className={styles.vineyardContainer}>
      {/* Header similar to vineyard */}
      <div className={styles.vineyardHeader}>
        <div className={styles.titleDropdownContainer}>
          <h1 className={styles.vineyardTitle}>
            WINERY
          </h1>
        </div>
        <div className={styles.desktopActions}>
          <button className={styles.actionButton}>ADD VINTAGE</button>
          <button className={styles.actionButton}>MANAGE INVENTORY</button>
          <button
            className={styles.iconButton}
            title="Winery Settings"
          >
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      {/* List view using ListItem component */}
      <div className={styles.vineList}>
        {vintages.map(vintage => (
          <ListItem
            key={vintage.id}
            id={`${vintage.year}`}
            primaryInfo={`${vintage.name} (${vintage.variety})`}
            secondaryInfo={`${vintage.stage} • ${vintage.volume} GAL`}
            status={vintage.status.toUpperCase()}
            statusWarning={vintage.status === 'Active'}
            onClick={() => console.log('Clicked vintage:', vintage.id)}
          />
        ))}
      </div>
    </div>
  );
};
