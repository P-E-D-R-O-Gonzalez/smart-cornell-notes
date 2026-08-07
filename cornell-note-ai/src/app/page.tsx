'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import ImageUploader from '@/components/ImageUploader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Note } from '@/types';
import { Calendar, Eye, Trash2, ArrowRight, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isDbAvailable, setIsDbAvailable] = useState(false);

  // Check database connectivity and fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-supabase-project.supabase.co';
      
      let fetchedNotes: Note[] = [];

      if (hasSupabase) {
        try {
          const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            fetchedNotes = data as Note[];
            setIsDbAvailable(true);
          } else {
            console.warn('Supabase database error, falling back to local storage.');
          }
        } catch (err) {
          console.warn('Failed to connect to Supabase, falling back to local storage:', err);
        }
      }

      // Fallback/load local storage notes
      try {
        const local = localStorage.getItem('cornell_notes');
        const localNotes: Note[] = local ? JSON.parse(local) : [];
        
        // Merge notes (avoiding duplicates by id)
        const combined = [...fetchedNotes];
        localNotes.forEach(localNote => {
          if (!combined.some(n => n.id === localNote.id)) {
            combined.push(localNote);
          }
        });

        // Sort combined notes by created_at descending
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setNotes(combined);
      } catch (err) {
        console.error('Error loading local notes:', err);
      }
    };

    fetchNotes();
  }, []);

  // Animate loading steps
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      const steps = [1000, 2500, 4500]; // timing for state changes
      
      const runStep = (index: number) => {
        if (index < steps.length) {
          timer = setTimeout(() => {
            setLoadingStep(index + 1);
            runStep(index + 1);
          }, steps[index]);
        }
      };
      
      runStep(0);
    } else {
      setLoadingStep(0);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleImageSelected = async (base64Data: string, file: File) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Data }),
      });

      if (!response.ok) {
        throw new Error('Note generation failed.');
      }

      const generatedNote: Note = await response.json();

      // If it is a local fallback ID, save it to local storage as well
      if (generatedNote.id.startsWith('local-')) {
        try {
          const local = localStorage.getItem('cornell_notes');
          const localNotes: Note[] = local ? JSON.parse(local) : [];
          localNotes.unshift(generatedNote);
          localStorage.setItem('cornell_notes', JSON.stringify(localNotes));
        } catch (err) {
          console.error('Failed to save note to local storage:', err);
        }
      }

      // Add to state and redirect
      setNotes((prev) => [generatedNote, ...prev]);
      router.push(`/notes/${generatedNote.id}`);

    } catch (err) {
      console.error('Error generating notes:', err);
      alert('Failed to generate note. Check your API keys and connection.');
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      // 1. Delete from local storage if exists
      const local = localStorage.getItem('cornell_notes');
      if (local) {
        const localNotes: Note[] = JSON.parse(local);
        const updated = localNotes.filter((n) => n.id !== id);
        localStorage.setItem('cornell_notes', JSON.stringify(updated));
      }

      // 2. Delete from database if database is configured and it's a DB note
      if (isDbAvailable && !id.startsWith('local-')) {
        await supabase.from('notes').delete().eq('id', id);
      }

      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="container">
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Cornell Note AI</h1>
          <p className={styles.heroSubtitle}>
            Our AI extracts core concepts and generates structured + printable Cornell notes.
          </p>
        </section>

        {/* Uploader Section */}
        <section className={styles.uploadSection}>
          {isLoading ? (
            <Card>
              <CardContent className={styles.loadingCard}>
                <div className={styles.spinner} />
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '4px' }}>Generating Your Cornell Notes</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Processing visual contents...</p>
                </div>
                
                {/* Visual indicator of pipeline steps */}
                <div className={styles.loadingSteps}>
                  <div className={`${styles.loadingStep} ${loadingStep >= 0 ? styles.loadingStepActive : ''}`}>
                    {loadingStep > 0 ? <CheckCircle2 size={14} color="var(--secondary)" /> : <Sparkles size={14} />}
                    <span>Extracting text and analyzing structure...</span>
                  </div>
                  <div className={`${styles.loadingStep} ${loadingStep >= 1 ? styles.loadingStepActive : ''}`}>
                    {loadingStep > 1 ? <CheckCircle2 size={14} color="var(--secondary)" /> : <BookOpen size={14} />}
                    <span>Formulating cues and questions...</span>
                  </div>
                  <div className={`${styles.loadingStep} ${loadingStep >= 2 ? styles.loadingStepActive : ''}`}>
                    {loadingStep > 2 ? <CheckCircle2 size={14} color="var(--secondary)" /> : <Sparkles size={14} />}
                    <span>Structuring final Cornell layout...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent style={{ padding: '24px' }}>
                <ImageUploader onImageSelected={handleImageSelected} isLoading={isLoading} />
              </CardContent>
            </Card>
          )}
        </section>

        {/* Recent Notes Section */}
        <section className={styles.notesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Study Notes</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isDbAvailable ? 'Connected to Supabase' : 'Offline Mode (Local Storage)'}
            </span>
          </div>

          {notes.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen size={40} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <h3 style={{ fontWeight: 600, marginBottom: '4px' }}>No notes generated yet</h3>
              <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                Snap a photo or drag in an image above to start learning!
              </p>
            </div>
          ) : (
            <div className={styles.notesGrid}>
              {notes.map((note) => (
                <Card key={note.id} interactive onClick={() => router.push(`/notes/${note.id}`)}>
                  <CardContent className={styles.noteCardContent}>
                    <h3 className={styles.noteCardTitle}>{note.title}</h3>
                    <div className={styles.noteCardDate}>
                      <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <p className={styles.noteCardExcerpt}>{note.summary}</p>
                    
                    <div className={styles.noteCardFooter}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="no-print"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/notes/${note.id}`)}
                      >
                        Study <ArrowRight size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
