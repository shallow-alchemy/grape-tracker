import { useState } from 'react';
import { FiCheck, FiAlertCircle } from 'react-icons/fi';
import { getBackendUrl } from '../config';
import styles from '../App.module.css';

type TrainingRecommendation = {
  method: string;
  method_label: string;
  confidence: string;
  reasoning: string;
};

type TrainingRecommendationResponse = {
  recommendations: TrainingRecommendation[];
  context_summary: string;
};

type AITrainingHelperProps = {
  blockName: string;
  varieties: string[];
  location?: string;
  vineyardLocation?: string;
  soilType?: string;
  sizeAcres?: number;
  vineCount: number;
  availableLaborHours?: number | null;
  onSelectMethod: (method: string) => void;
};

export const AITrainingHelper = ({
  blockName,
  varieties,
  location,
  vineyardLocation,
  soilType,
  sizeAcres,
  vineCount,
  availableLaborHours,
  onSelectMethod,
}: AITrainingHelperProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [contextSummary, setContextSummary] = useState<string>('');

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/ai/training-recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          block_name: blockName,
          varieties,
          location: location || null,
          vineyard_location: vineyardLocation || null,
          soil_type: soilType || null,
          size_acres: sizeAcres || null,
          vine_count: vineCount,
          available_labor_hours: availableLaborHours || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data: TrainingRecommendationResponse = await response.json();
      setRecommendations(data.recommendations);
      setContextSummary(data.context_summary);
    } catch (err) {
      setError('Unable to get AI recommendations. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceStyle = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return { color: 'var(--color-primary)' };
      case 'medium':
        return { color: 'var(--color-text-accent)' };
      default:
        return { color: 'var(--color-text-muted)' };
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className={styles.aiHelperSection}>
        <p className={styles.sectionPlaceholder}>
          Get recommendations based on your block's varieties and terroir.
        </p>
        <button
          type="button"
          className={styles.formButton}
          onClick={fetchRecommendations}
          disabled={isLoading}
          style={{ marginTop: 'var(--spacing-md)' }}
        >
          {isLoading ? 'ANALYZING...' : 'GET RECOMMENDATIONS'}
        </button>
        {error && (
          <div className={styles.formError} style={{ marginTop: 'var(--spacing-sm)' }}>
            <FiAlertCircle style={{ marginRight: 'var(--spacing-xs)' }} />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.aiHelperSection}>
      <div className={styles.aiContextSummary}>
        <span className={styles.aiLabel}>ANALYZED:</span> {contextSummary}
      </div>
      <div className={styles.aiRecommendations}>
        {recommendations.map((rec, index) => (
          <div key={rec.method} className={styles.aiRecommendationCard}>
            <div className={styles.aiRecommendationHeader}>
              <span className={styles.aiRecommendationRank}>#{index + 1}</span>
              <span className={styles.aiRecommendationMethod}>{rec.method_label}</span>
              <span
                className={styles.aiRecommendationConfidence}
                style={getConfidenceStyle(rec.confidence)}
              >
                {rec.confidence.toUpperCase()}
              </span>
            </div>
            <p className={styles.aiRecommendationReasoning}>{rec.reasoning}</p>
            <button
              type="button"
              className={styles.formButtonSecondary}
              onClick={() => onSelectMethod(rec.method)}
              style={{ marginTop: 'var(--spacing-sm)' }}
            >
              <FiCheck style={{ marginRight: 'var(--spacing-xs)' }} />
              USE THIS METHOD
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.formButtonSecondary}
        onClick={fetchRecommendations}
        disabled={isLoading}
        style={{ marginTop: 'var(--spacing-md)' }}
      >
        {isLoading ? 'ANALYZING...' : 'GET NEW RECOMMENDATIONS'}
      </button>
    </div>
  );
};
