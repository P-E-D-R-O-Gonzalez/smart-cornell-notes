'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { Note } from '@/types';
import { Calendar, Trash2, ArrowRight, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import styles from '../page.module.css';

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isDbAvailable, setIsDbAvailable] = useState(false);
  const [includeQuestions, setIncludeQuestions] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(false);

  // Check database connectivity and fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      let fetchedNotes: Note[] = [];

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
  }, [supabase]);

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

  const handleImageSelected = async (base64Data: string, _file: File) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          includeQuestions,
          includeSummary,
        }),
      });

      if (!response.ok) {
        throw new Error('Note generation failed.');
      }

      const generatedNote: Note = await response.json();

      // Save to local storage
      try {
        const local = localStorage.getItem('cornell_notes');
        const localNotes: Note[] = local ? JSON.parse(local) : [];
        localNotes.unshift(generatedNote);
        localStorage.setItem('cornell_notes', JSON.stringify(localNotes));
      } catch (err) {
        console.error('Failed to save note to local storage:', err);
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
    <div className="light-theme" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="container" style={{ flex: 1, padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', marginTop: '10px' }}>
          <div>
            <img
              src="../pitstopNotes.png"
              alt="Pitstop Notes Logo"
              style={{
                width: '145px',
                height: '145px',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>

        {/* Subtitle */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '1.05rem',
            color: '#ffffffff',
            fontWeight: 500,
            maxWidth: '550px',
            margin: '0 auto 28px auto',
            lineHeight: 1.5,
            fontFamily: 'var(--font-inter)',
          }}
        >Our AI extracts notes and generates printable Cornell notes.</p>

        {/* Upload Action Pill / Loading Card */}
        <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto 48px auto' }}>
          {isLoading ? (
            <Card style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
              <CardContent className={styles.loadingCard}>
                <div className={styles.spinner} style={{ borderTopColor: '#2563eb' }} />
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '6px', color: '#ffffffff', fontFamily: 'var(--font-outfit)' }}>
                    Generating Your Cornell Notes
                  </h3>
                  <p style={{ color: '#ffffffff', fontSize: '0.9rem' }}>Processing visual contents...</p>
                </div>

                {/* Visual indicator of pipeline steps */}
                <div className={styles.loadingSteps} style={{ color: '#ffffffff' }}>
                  <div className={`${styles.loadingStep} ${loadingStep >= 0 ? styles.loadingStepActive : ''}`} style={{ color: loadingStep >= 0 ? '#2563eb' : '#9ca3af', opacity: loadingStep >= 0 ? 1 : 0.5 }}>
                    {loadingStep > 0 ? <CheckCircle2 size={16} color="#10b981" /> : <Sparkles size={16} />}
                    <span>Extracting text and analyzing structure...</span>
                  </div>
                  <div className={`${styles.loadingStep} ${loadingStep >= 1 ? styles.loadingStepActive : ''}`} style={{ color: loadingStep >= 1 ? '#2563eb' : '#9ca3af', opacity: loadingStep >= 1 ? 1 : 0.5 }}>
                    {loadingStep > 1 ? <CheckCircle2 size={16} color="#10b981" /> : <BookOpen size={16} />}
                    <span>Formulating cues and questions...</span>
                  </div>
                  <div className={`${styles.loadingStep} ${loadingStep >= 2 ? styles.loadingStepActive : ''}`} style={{ color: loadingStep >= 2 ? '#2563eb' : '#9ca3af', opacity: loadingStep >= 2 ? 1 : 0.5 }}>
                    {loadingStep > 2 ? <CheckCircle2 size={16} color="#10b981" /> : <Sparkles size={16} />}
                    <span>Structuring final Cornell layout...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ImageUploader onImageSelected={handleImageSelected} isLoading={isLoading} variant="pill" />
          )}

          {!isLoading && (
            <div
              aria-label="Generation options"
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '18px',
              }}
            >
              <button
                type="button"
                aria-pressed={includeQuestions}
                onClick={() => setIncludeQuestions((enabled) => !enabled)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: `1px solid ${includeQuestions ? '#2563eb' : 'rgba(0, 0, 0, 0.14)'}`,
                  borderRadius: '9999px',
                  padding: '9px 14px',
                  backgroundColor: includeQuestions ? '#dbeafe' : '#ffffff',
                  color: '#111827',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '30px',
                    height: '18px',
                    borderRadius: '9999px',
                    backgroundColor: includeQuestions ? '#2563eb' : '#9ca3af',
                    padding: '2px',
                    display: 'inline-flex',
                    justifyContent: includeQuestions ? 'flex-end' : 'flex-start',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
                </span>
                Generate questions
              </button>
              <button
                type="button"
                aria-pressed={includeSummary}
                onClick={() => setIncludeSummary((enabled) => !enabled)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: `1px solid ${includeSummary ? '#2563eb' : 'rgba(0, 0, 0, 0.14)'}`,
                  borderRadius: '9999px',
                  padding: '9px 14px',
                  backgroundColor: includeSummary ? '#dbeafe' : '#ffffff',
                  color: '#111827',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '30px',
                    height: '18px',
                    borderRadius: '9999px',
                    backgroundColor: includeSummary ? '#2563eb' : '#9ca3af',
                    padding: '2px',
                    display: 'inline-flex',
                    justifyContent: includeSummary ? 'flex-end' : 'flex-start',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
                </span>
                Generate summary
              </button>
            </div>
          )}
        </div>

        <div>
          <p style={{
            textAlign: 'center',
            fontSize: '1.05rem',
            color: '#ffffffff',
            fontWeight: 500,
            maxWidth: '550px',
            margin: '0 auto 28px auto',
            lineHeight: 1.5,
            fontFamily: 'var(--font-inter)',
          }}>Disclaimer:  We share data with <a style={{ color: '#2563eb' }} href="https://help.openai.com/en/articles/10306912-sharing-feedback-evaluation-and-fine-tuning-data-and-api-inputs-and-outputs-with-openai" target="_blank" rel="noopener noreferrer">OpenAI</a> To make this service free</p>
        </div>

        {/* Recent Notes Section */}
        <section className={styles.notesSection} style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: '#f8f8f8ff',
                fontFamily: 'var(--font-outfit)',
                letterSpacing: '-0.02em',
                textAlign: 'center',
              }}
            >
              Your Notes <span style={{ color: '#2563eb' }}>Supercharged</span>
            </h2>
          </div>

          {notes.length === 0 ? (
            <div className={styles.emptyState} style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderColor: 'rgba(0,0,0,0.08)', padding: '50px 20px' }}>
              <BookOpen size={44} style={{ margin: '0 auto 16px auto', opacity: 0.6, color: '#2563eb' }} />
              <h3 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '6px', color: '#111827' }}>No notes generated yet</h3>
              <p style={{ fontSize: '0.9rem', color: '#4b5563', maxWidth: '320px', margin: '0 auto' }}>
                Snap a photo or upload an image using the controls above to start learning!
              </p>
            </div>
          ) : (
            <div className={styles.notesGrid}>
              {notes.map((note) => (
                <Card
                  key={note.id}
                  interactive
                  onClick={() => router.push(`/notes/${note.id}`)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)';
                  }}
                >
                  <CardContent className={styles.noteCardContent}>
                    <h3 className={styles.noteCardTitle} style={{ color: '#111827', fontWeight: 700, fontSize: '1.15rem' }}>{note.title}</h3>
                    <div className={styles.noteCardDate} style={{ color: '#6b7280' }}>
                      <Calendar size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <p className={styles.noteCardExcerpt} style={{ color: '#4b5563', fontSize: '0.875rem' }}>{note.summary}</p>

                    <div className={styles.noteCardFooter} style={{ borderTopColor: 'rgba(0,0,0,0.06)' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="no-print"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        style={{ color: '#9ca3af' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                      >
                        <Trash2 size={15} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/notes/${note.id}`)}
                        style={{ borderColor: '#2563eb', color: '#2563eb', fontWeight: 600 }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#2563eb';
                        }}
                      >
                        Study <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
