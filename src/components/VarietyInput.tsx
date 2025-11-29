import { useState, useRef, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { matchVariety, normalizeVariety, CANONICAL_VARIETIES } from '../constants/varieties';
import styles from '../App.module.css';

type VarietyInputProps = {
  value: string[];
  onChange: (varieties: string[]) => void;
  placeholder?: string;
};

export const VarietyInput = ({
  value,
  onChange,
  placeholder = 'Type to search varieties...',
}: VarietyInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update suggestions when input changes
  useEffect(() => {
    if (inputValue.trim()) {
      const matches = matchVariety(inputValue).filter(
        (v) => !value.includes(v) && !value.includes(v.toUpperCase())
      );
      setSuggestions(matches);
      setHighlightedIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addVariety = (variety: string) => {
    const normalized = normalizeVariety(variety);
    if (normalized && !value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeVariety = (variety: string) => {
    onChange(value.filter((v) => v !== variety));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && showSuggestions) {
        addVariety(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        // Add as custom variety
        addVariety(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last variety when backspacing on empty input
      removeVariety(value[value.length - 1]);
    }
  };

  const isCanonical = (variety: string) => {
    return CANONICAL_VARIETIES.some(
      (v) => v === variety || v.toUpperCase() === variety
    );
  };

  return (
    <div className={styles.varietyInputContainer} ref={containerRef}>
      <div className={styles.varietyTagsInput}>
        {value.map((variety) => (
          <span
            key={variety}
            className={`${styles.varietyTag} ${!isCanonical(variety) ? styles.varietyTagCustom : ''}`}
            title={!isCanonical(variety) ? 'Custom variety (not in standard list)' : ''}
          >
            {variety}
            <button
              type="button"
              className={styles.varietyTagRemove}
              onClick={() => removeVariety(variety)}
              aria-label={`Remove ${variety}`}
            >
              <FiX size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className={styles.varietyInputField}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className={styles.varietySuggestions}>
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              className={`${styles.varietySuggestion} ${index === highlightedIndex ? styles.varietySuggestionHighlighted : ''}`}
              onClick={() => addVariety(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}

      {showSuggestions && inputValue.trim() && suggestions.length === 0 && (
        <ul className={styles.varietySuggestions}>
          <li
            className={`${styles.varietySuggestion} ${styles.varietySuggestionHighlighted}`}
            onClick={() => addVariety(inputValue)}
          >
            Add "{inputValue.toUpperCase()}" as custom variety
          </li>
        </ul>
      )}
    </div>
  );
};
