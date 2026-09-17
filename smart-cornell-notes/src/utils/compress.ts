/**
 * Compresses an image client-side using HTML5 Canvas.
 * @param file The original image file
 * @param maxWidth The maximum width of the output image (default: 1200)
 * @param maxHeight The maximum height of the output image (default: 1200)
 * @param quality The quality of the JPEG compression (0.0 to 1.0, default: 0.7)
 * @returns A promise resolving to a compressed Blob
 */
export function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image.'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio and clamp size
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context could not be created.'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas compression failed.'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Image failed to load.'));
      };
    };

    reader.onerror = () => {
      reject(new Error('File reader error.'));
    };
  });
}
