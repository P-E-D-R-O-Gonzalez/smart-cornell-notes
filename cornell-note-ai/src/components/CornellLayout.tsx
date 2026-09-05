'use client';

import React, { useState, useEffect } from 'react';
import styles from './CornellLayout.module.css';
import { Button } from '@/components/ui/Button';
import { CornellData } from '@/types';
import { Save, Printer, Plus, Trash2, Calendar, FileText, ImageIcon } from 'lucide-react';
import { RichTextEditor } from './ui/RichTextEditor';
import { FloatingSelectionToolbar } from './FloatingSelectionToolbar';

interface CornellLayoutProps {
  initialData: CornellData;
  onSave?: (data: CornellData) => Promise<void>;
  isSaving?: boolean;
  imageUrl?: string;
  createdAt?: string;
}

function normalizeList(value: string[] | string | undefined | null): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

export const CornellLayout: React.FC<CornellLayoutProps> = ({
  initialData,
  onSave,
  isSaving = false,
  imageUrl,
  createdAt,
}) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [cues, setCues] = useState<string[]>(() => normalizeList(initialData.cues));
  const [notes, setNotes] = useState<string[]>(() => normalizeList(initialData.notes));
  const [summary, setSummary] = useState(initialData.summary || '');
  const [isDirty, setIsDirty] = useState(false);

  // Sync state if initialData changes (e.g. fresh load or API returns new data)
  useEffect(() => {
    setTitle(initialData.title || '');
    setCues(normalizeList(initialData.cues));
    setNotes(normalizeList(initialData.notes));
    setSummary(initialData.summary || '');
    setIsDirty(false);
  }, [initialData]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsDirty(true);
  };

  const handleCueChange = (index: number, val: string) => {
    const newCues = [...cues];
    newCues[index] = val;
    setCues(newCues);
    setIsDirty(true);
  };

  const addCue = () => {
    setCues([...cues, '']);
    setIsDirty(true);
  };

  const deleteCue = (index: number) => {
    const newCues = cues.filter((_, i) => i !== index);
    setCues(newCues);
    setIsDirty(true);
  };

  const handleNoteChange = (index: number, val: string) => {
    const newNotes = [...notes];
    newNotes[index] = val;
    setNotes(newNotes);
    setIsDirty(true);
  };

  const addNote = () => {
    setNotes([...notes, '']);
    setIsDirty(true);
  };

  const deleteNote = (index: number) => {
    const newNotes = notes.filter((_, i) => i !== index);
    setNotes(newNotes);
    setIsDirty(true);
  };

  const handleSummaryChange = (val: string) => {
    setSummary(val);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    try {
      await onSave({ title, cues, notes, summary });
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save Cornell notes:', err);
      alert('Failed to save note.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  return (
    <div className={styles.paper}>
      {/* Top Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <input
            type="text"
            className={styles.titleInput}
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled Lecture Note"
          />
          <div className={styles.metaInfo}>
            <div className={styles.metaItem}>
              <Calendar size={13} />
              <span>{formattedDate}</span>
            </div>
            <div className={styles.metaItem}>
              <FileText size={13} />
              <span>Cornell Study Method</span>
            </div>
            {imageUrl && (
              <div className={`${styles.metaItem} no-print`}>
                <ImageIcon size={13} />
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline', color: 'var(--primary)' }}
                >
                  View Source Image
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Buttons (Save and Print) */}
        <div className={`${styles.actions} no-print`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={16} /> Print / PDF
          </Button>
          {onSave && (
            <Button
              variant={isDirty ? 'primary' : 'outline'}
              size="sm"
              onClick={handleSave}
              disabled={isSaving || (!isDirty && !isSaving)}
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Body (Cues & Notes) */}
      <div className={styles.bodyGrid}>
        {/* Left Column: Cues */}
        <div className={styles.cuesColumn}>
          <div className={styles.columnHeader}>
            <span>Questions</span>
          </div>
          <ul className={styles.itemList}>
            {cues.map((cue, idx) => (
              <li key={`cue-${idx}`} className={styles.itemRow}>
                <span className={styles.itemBullet}>?</span>
                <RichTextEditor
                  value={cue}
                  onChange={(val) => handleCueChange(idx, val)}
                  className={styles.itemText}
                  placeholder="Question"
                />
                <button
                  type="button"
                  onClick={() => deleteCue(idx)}
                  className={styles.deleteButton}
                  title="Delete cue"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={addCue} className={styles.addButton}>
            <Plus size={14} /> Add Question
          </button>
        </div>

        {/* Right Column: Detailed Notes */}
        <div className={styles.notesColumn}>
          <div className={styles.columnHeader}>
            <span>Notes</span>
          </div>
          <ul className={styles.itemList}>
            {notes.map((note, idx) => (
              <li key={`note-${idx}`} className={styles.itemRow}>
                <span className={styles.itemBullet}>•</span>
                <RichTextEditor
                  value={note}
                  onChange={(val) => handleNoteChange(idx, val)}
                  className={styles.itemText}
                  placeholder="Record lecture facts, bullet points, and ideas..."
                />
                <button
                  type="button"
                  onClick={() => deleteNote(idx)}
                  className={styles.deleteButton}
                  title="Delete note item"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={addNote} className={styles.addButton}>
            <Plus size={14} /> Add Fact / Bullet
          </button>
        </div>
      </div>

      {/* Bottom Row: Summary */}
      <div className={styles.summarySection}>
        <RichTextEditor
          className={styles.summaryTextarea}
          value={summary}
          onChange={handleSummaryChange}
          placeholder="Summarize the main points of this note page in a few complete sentences..."
        />
      </div>
      <FloatingSelectionToolbar />
    </div>
  );
};

export default CornellLayout;
