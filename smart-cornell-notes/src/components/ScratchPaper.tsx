'use client';

import { useRef } from 'react';
import { FilePlus2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from './ScratchPaper.module.css';

export function ScratchPaper() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const paperRef = useRef<HTMLTextAreaElement>(null);

  const discardText = () => {
    if (paperRef.current) paperRef.current.value = '';
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          discardText();
          dialogRef.current?.showModal();
          paperRef.current?.focus();
        }}
      >
        <FilePlus2 size={16} /> Thought Pad
      </Button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="scratch-paper-title"
        aria-describedby="scratch-paper-description"
        onClose={discardText}
      >
        <div className={styles.header}>
          <div>
            <h2 id="scratch-paper-title">Blurt / Recall / Explain it without looking</h2>
            <p id="scratch-paper-description">
              Nothing is saved. Closing this sheet or leaving the note discards your text.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close and discard scratch paper"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={20} />
          </Button>
        </div>
        {/* Uncontrolled, in-memory text: never connected to note saving or storage. */}
        <textarea
          ref={paperRef}
          className={styles.paper}
          aria-label="Temporary scratch paper"
          aria-describedby="scratch-paper-description"
          autoComplete="off"
          spellCheck={false}
        />
      </dialog>
    </>
  );
}
