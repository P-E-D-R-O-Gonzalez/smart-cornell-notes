'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './ImageUploader.module.css';
import { Button } from '@/components/ui/Button';
import { compressImage } from '@/utils/compress';
import { Upload, Camera, FileImage, RefreshCw, Trash2, StopCircle } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64Data: string, file: File) => void;
  isLoading?: boolean;
  variant?: 'dropzone' | 'pill';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  isLoading = false,
  variant = 'dropzone'
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const processSelectedFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    try {
      // Compress the image before uploading
      const compressedBlob = await compressImage(file, 1200, 1200, 0.7);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      setSelectedFile(compressedFile);

      // Create a local URL for the preview
      const localUrl = URL.createObjectURL(compressedBlob);
      setPreviewUrl(localUrl);

      // Convert to Base64 to send to API
      const reader = new FileReader();
      reader.readAsDataURL(compressedBlob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        onImageSelected(base64data, compressedFile);
      };
    } catch (err) {
      console.error('Image compression error:', err);
      alert('Failed to process image. Please try again.');
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError(null);
    setSelectedFile(null);
    setPreviewUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Error accessing webcam:', err);
      setCameraError('Could not access camera. Please make sure you have allowed permissions.');
      setIsCameraActive(false);
    }
  };


  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `captured-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            stopCamera();
            await processSelectedFile(file);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
        disabled={isLoading}
      />

      {/* Main Drag-and-Drop Area or Preview */}
      {!previewUrl && !isCameraActive && variant === 'dropzone' && (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <div className={styles.iconWrapper}>
            <Upload size={24} />
          </div>
          <div>
            <p className={styles.title}>Drag & drop an image here</p>
            <p className={styles.subtitle}>Supports PNG, JPG, or JPEG</p>
          </div>

          <div className={styles.divider}>Or</div>

          <div onClick={(e) => e.stopPropagation()} style={{ zIndex: 10 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={startCamera}
              disabled={isLoading}
            >
              <Camera size={16} /> Use Camera
            </Button>
          </div>
        </div>
      )}

      {/* Pill-shaped upload and camera selector */}
      {!previewUrl && !isCameraActive && variant === 'pill' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '9999px',
            padding: '12px 32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb',
            gap: '28px',
            width: 'fit-content',
            margin: '0 auto',
          }}
        >
          <button
            onClick={onButtonClick}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              borderRadius: '50%',
              transition: 'background-color 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Upload Note Image"
          >
            <Upload size={24} />
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />
          <button
            onClick={startCamera}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              borderRadius: '50%',
              transition: 'background-color 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Take Photo"
          >
            <Camera size={24} />
          </button>
        </div>
      )}

      {/* Camera Live Stream */}
      {isCameraActive && (
        <div className={styles.cameraContainer}>
          <div className={styles.videoWrapper}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={styles.video}
            />
          </div>
          {cameraError && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{cameraError}</p>}
          <div className={styles.actions}>
            <Button variant="primary" onClick={capturePhoto} disabled={isLoading}>
              <Camera size={16} /> Snap Photo
            </Button>
            <Button variant="outline" onClick={stopCamera}>
              <StopCircle size={16} /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Preview Image Mode */}
      {previewUrl && (
        <div className={styles.previewContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Upload Preview"
            className={styles.previewImage}
          />
          <div className={styles.actions}>
            <Button variant="outline" onClick={onButtonClick} disabled={isLoading}>
              <RefreshCw size={16} /> Replace Image
            </Button>
            <Button variant="danger" onClick={clearSelection} disabled={isLoading}>
              <Trash2 size={16} /> Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
