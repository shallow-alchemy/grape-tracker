import { useState, useRef, useEffect } from 'react';
import { FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import styles from '../App.module.css';

type InlineEditProps = {
  value: string;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'select' | 'date' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  formatDisplay?: (value: string) => string;
};

export const InlineEdit = ({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = 'Click to edit',
  label,
  disabled = false,
  formatDisplay,
}: InlineEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' && 'select' in inputRef.current) {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, type]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = formatDisplay ? formatDisplay(value) : value;

  if (disabled) {
    return (
      <div className={styles.inlineEditContainer}>
        {label && <span className={styles.detailLabel}>{label}</span>}
        <span className={styles.detailValue}>{displayValue || placeholder}</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={styles.inlineEditContainer}>
        {label && <span className={styles.detailLabel}>{label}</span>}
        <div className={styles.inlineEditInputWrapper}>
          {type === 'select' ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className={styles.inlineEditSelect}
              disabled={isSaving}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.inlineEditTextarea}
              disabled={isSaving}
              placeholder={placeholder}
              rows={3}
            />
          ) : type === 'date' ? (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="date"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className={styles.inlineEditInput}
              disabled={isSaving}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className={styles.inlineEditInput}
              disabled={isSaving}
              placeholder={placeholder}
            />
          )}
          {type === 'textarea' && (
            <div className={styles.inlineEditActions}>
              <button
                type="button"
                className={styles.inlineEditActionBtn}
                onClick={handleSave}
                disabled={isSaving}
                title="Save"
              >
                <FiCheck size={14} />
              </button>
              <button
                type="button"
                className={styles.inlineEditActionBtn}
                onClick={handleCancel}
                disabled={isSaving}
                title="Cancel"
              >
                <FiX size={14} />
              </button>
            </div>
          )}
          {isSaving && <span className={styles.inlineEditSaving}>Saving...</span>}
          {error && <span className={styles.inlineEditError}>{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.inlineEditContainer}>
      {label && <span className={styles.detailLabel}>{label}</span>}
      <button
        type="button"
        className={styles.inlineEditButton}
        onClick={() => setIsEditing(true)}
        title="Click to edit"
      >
        <span className={styles.inlineEditValue}>
          {displayValue || <span className={styles.inlineEditPlaceholder}>{placeholder}</span>}
        </span>
        <FiEdit2 className={styles.inlineEditIcon} size={14} />
      </button>
    </div>
  );
};
