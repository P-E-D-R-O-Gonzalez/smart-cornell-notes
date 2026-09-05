'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Eraser } from 'lucide-react';
import styles from './FloatingSelectionToolbar.module.css';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'rgba(234, 179, 8, 0.35)', dotColor: '#eab308' },
  { name: 'Green', value: 'rgba(34, 197, 94, 0.3)', dotColor: '#22c55e' },
  { name: 'Pink', value: 'rgba(236, 72, 153, 0.3)', dotColor: '#ec4899' },
  { name: 'Blue', value: 'rgba(59, 130, 246, 0.3)', dotColor: '#3b82f6' },
];

export const FloatingSelectionToolbar: React.FC = () => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setIsVisible(false);
        return;
      }

      const range = selection.getRangeAt(0);
      
      // Make sure the selection is within a rich editor
      let parent: HTMLElement | null = range.commonAncestorContainer as HTMLElement;
      if (parent.nodeType === Node.TEXT_NODE) {
        parent = parent.parentElement;
      }
      
      if (!parent || !parent.closest('[data-rich-editor="true"]')) {
        setIsVisible(false);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setIsVisible(false);
        return;
      }

      // We have a valid selection! Position the toolbar
      setIsVisible(true);
      
      const toolbarWidth = toolbarRef.current?.offsetWidth || 180;
      const toolbarHeight = toolbarRef.current?.offsetHeight || 40;
      
      setCoords({
        left: rect.left + rect.width / 2 - toolbarWidth / 2,
        top: rect.top - toolbarHeight - 8, // 8px spacing
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('resize', handleSelectionChange);
    window.addEventListener('scroll', handleSelectionChange, { capture: true });

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('resize', handleSelectionChange);
      window.removeEventListener('scroll', handleSelectionChange, { capture: true });
    };
  }, []);

  const triggerInputEvent = () => {
    // Dispatch a native input event on the active element to force React's onInput state sync
    const activeEl = document.activeElement;
    if (activeEl && activeEl.getAttribute('data-rich-editor') === 'true') {
      const event = new Event('input', { bubbles: true });
      activeEl.dispatchEvent(event);
    }
  };

  const applyHighlight = (color: string) => {
    document.execCommand('backColor', false, color);
    triggerInputEvent();
  };

  const removeHighlight = () => {
    document.execCommand('backColor', false, 'rgba(0,0,0,0)');
    triggerInputEvent();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      className={styles.toolbar}
      style={{
        position: 'fixed',
        left: coords ? `${Math.max(10, Math.min(window.innerWidth - 190, coords.left))}px` : '-9999px',
        top: coords ? `${Math.max(10, coords.top)}px` : '-9999px',
      }}
      // Prevent losing selection on click
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className={styles.colorsRow}>
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            className={styles.colorButton}
            style={{ '--color': color.dotColor } as React.CSSProperties}
            onClick={() => applyHighlight(color.value)}
            title={`Highlight ${color.name}`}
          />
        ))}
        <div className={styles.divider} />
        <button
          type="button"
          className={styles.eraserButton}
          onClick={removeHighlight}
          title="Remove Highlight"
        >
          <Eraser size={14} />
        </button>
      </div>
    </div>
  );
};

export default FloatingSelectionToolbar;
