'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CornellLayout } from '@/components/CornellLayout';
import { Note, CornellData } from '@/types';
import { ChevronLeft, ArrowLeft, Loader2, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NoteViewerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchNote = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const response = await fetch(`/api/notes/${id}`);
        if (response.status === 404) {
          setErrorMsg('Note not found. It may have been deleted or you do not have access to it.');
        } else if (!response.ok) {
          throw new Error('Could not load note.');
        } else {
          setNote(await response.json());
        }
      } catch (err) {
        console.error('Failed to load note:', err);
        setErrorMsg('Could not load this note. Please try again.');
      }
      
      setIsLoading(false);
    };

    fetchNote();
  }, [id]);

  const handleSaveNote = async (updatedData: CornellData) => {
    if (!note || !id) return;
    setIsSaving(true);

    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!response.ok) throw new Error('Could not save note.');
      setNote(await response.json());
    } catch (err) {
      console.error('Database update failed:', err);
      alert('Failed to save this note. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
          classPeriod: note.classPeriod,
          essentialQuestion: note.essentialQuestion,
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
