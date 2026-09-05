'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CornellLayout } from '@/components/CornellLayout';
import { Note, CornellData } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { ChevronLeft, ArrowLeft, Loader2, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NoteViewerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const supabase = createClient();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchNote = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      let dbNote: Note | null = null;

      // 1. Fetch from Supabase database if applicable
      if (!id.startsWith('local-')) {
        try {
          const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', id)
            .single();

          if (!error && data) {
            dbNote = data as Note;
          }
        } catch (err) {
          console.warn('Database fetch failed, checking local storage:', err);
        }
      }

      // 2. Fetch from local storage if DB note not found or if local ID
      if (!dbNote) {
        try {
          const local = localStorage.getItem('cornell_notes');
          if (local) {
            const localNotes: Note[] = JSON.parse(local);
            const found = localNotes.find((n) => n.id === id);
            if (found) {
              dbNote = found;
            }
          }
        } catch (err) {
          console.error('Failed to read from local storage:', err);
        }
      }

      if (dbNote) {
        setNote(dbNote);
      } else {
        setErrorMsg('Note not found. It may have been deleted or the link is invalid.');
      }
      
      setIsLoading(false);
    };

    fetchNote();
  }, [id, supabase]);

  const handleSaveNote = async (updatedData: CornellData) => {
    if (!note || !id) return;
    setIsSaving(true);

    // 1. Save to local storage
    try {
      const local = localStorage.getItem('cornell_notes');
      if (local) {
        const localNotes: Note[] = JSON.parse(local);
        const updated = localNotes.map((n) =>
          n.id === id
            ? { ...n, ...updatedData }
            : n
        );
        localStorage.setItem('cornell_notes', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Local storage update failed:', err);
    }

    // 2. Save to database if applicable
    if (!id.startsWith('local-')) {
      try {
        const { error } = await supabase
          .from('notes')
          .update({
            title: updatedData.title,
            cues: updatedData.cues,
            notes: updatedData.notes,
            summary: updatedData.summary,
          })
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.error('Database update failed:', err);
        alert('Failed to save to database, but changes were saved locally.');
      }
    }

    // Update state
    setNote((prev) => prev ? { ...prev, ...updatedData } : null);
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading Cornell Note...</p>
      </div>
    );
  }

  if (errorMsg || !note) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
        <FileWarning size={48} style={{ color: 'var(--accent)' }} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Note Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>{errorMsg || 'This page does not exist.'}</p>
        </div>
        <Link href="/dashboard" passHref>
          <Button variant="primary">
            <ArrowLeft size={16} /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '24px 0 60px 0' }}>
      {/* Back button */}
      <div className="no-print" style={{ marginBottom: '20px' }}>
        <Link href="/dashboard" passHref>
          <Button variant="ghost" size="sm" style={{ paddingLeft: '8px' }}>
            <ChevronLeft size={16} /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Interactive Cornell Layout */}
      <CornellLayout
        initialData={{
          title: note.title,
          cues: note.cues,
          notes: note.notes,
          summary: note.summary,
        }}
        imageUrl={note.image_url}
        createdAt={note.created_at}
        onSave={handleSaveNote}
        isSaving={isSaving}
      />
    </div>
  );
}
