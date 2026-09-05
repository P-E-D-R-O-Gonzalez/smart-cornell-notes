'use client';

import React, { useEffect, useRef } from 'react';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  className,
  placeholder,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(value);

  // Sync prop value to DOM if it changed from the outside
  useEffect(() => {
    if (ref.current && value !== ref.current.innerHTML && value !== lastHtml.current) {
      ref.current.innerHTML = value || '';
      lastHtml.current = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastHtml.current = html;
    onChange(html);
  };

  // Intercept paste to only insert plain text, avoiding formatted/styled HTML clutter
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // Check if there is an active selection range
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    selection.deleteFromDocument();
    const textNode = document.createTextNode(text);
    selection.getRangeAt(0).insertNode(textNode);

    // Collapse selection to end of inserted text
    selection.collapseToEnd();
    handleInput();
  };

  return (
    <div
      ref={ref}
      contentEditable
      onInput={handleInput}
      onBlur={handleInput}
      onPaste={handlePaste}
      className={`${styles.editor} ${className || ''}`}
      aria-placeholder={placeholder}
      data-rich-editor="true"
      style={{
        outline: 'none',
        wordBreak: 'break-word',
        minHeight: '1.6em',
      }}
    />
  );
};

export default RichTextEditor;
