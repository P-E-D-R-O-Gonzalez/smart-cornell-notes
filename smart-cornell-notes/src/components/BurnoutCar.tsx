'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import styles from './BurnoutCar.module.css';

export default function BurnoutCar() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackAttempt = useRef(0);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    return () => { audio?.pause(); };
  }, []);

  useEffect(() => {
    if (!position) return;
    window.dispatchEvent(new CustomEvent('burnout-playback', { detail: { active: true } }));
    // Also reset if an animation is interrupted or the tab is backgrounded.
    const timeout = window.setTimeout(() => setPosition(null), 30400);
    return () => {
      window.clearTimeout(timeout);
      window.dispatchEvent(new CustomEvent('burnout-playback', { detail: { active: false } }));
    };
  }, [position]);

  function playSound() {
    const audio = audioRef.current;
    if (audio) {
      setAudioError(false);
      if (audio.error) audio.load();
      audio.muted = false;
      audio.volume = 1;
      audio.currentTime = 0;
      const attempt = ++playbackAttempt.current;
      void audio.play().catch(() => {
        if (attempt === playbackAttempt.current) setAudioError(true);
      });
    }
  }

  function stopBurnout() {
    playbackAttempt.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setAudioError(false);
    setPosition(null);
  }

  function startBurnout() {
    if (position) {
      stopBurnout();
      return;
    }
    if (!buttonRef.current) return;
    playSound();
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  }

  return (
    <>
      <audio ref={audioRef} src="/supercharged_burnout.mp3" preload="auto" onError={() => setAudioError(true)} />
      {audioError && (
        <div className={styles.audioNotice} role="status">
          Sound couldn’t play. <button type="button" onClick={playSound}>Retry sound</button>
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        onClick={startBurnout}
        aria-label={position ? 'Stop the burnout and sound' : 'Make the car do a burnout'}
        aria-pressed={!!position}
        title={position ? 'Click again to stop' : 'Click for a burnout!'}
      >
        <img className={position ? styles.hidden : styles.image} src="/car.png" alt="" draggable={false} />
      </button>
      {position && createPortal(
        <div className={styles.overlay}>
          <div
            className={styles.car}
            style={position}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setPosition(null);
            }}
          >
            <span className={styles.smoke} aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => (
                <i key={index} style={{ '--puff': index } as CSSProperties} />
              ))}
            </span>
            <div className={styles.revving} aria-hidden="true">
              <img className={styles.image} src="/car.png" alt="" draggable={false} />
              <span className={styles.exhaustFlames}>
                {Array.from({ length: 4 }, (_, index) => (
                  <span
                    key={index}
                    className={styles.flameJet}
                    style={{ '--jet': index } as CSSProperties}
                  ><i /></span>
                ))}
              </span>
            </div>
            <button
              type="button"
              className={styles.stopTarget}
              onClick={stopBurnout}
              tabIndex={-1}
              aria-label="Stop the burnout and sound"
              title="Click again to stop"
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
