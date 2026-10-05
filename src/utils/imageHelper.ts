// Utility to clean and format image URLs for cross-browser reliability and Google Drive / Dropbox / Imgur compatibility

export function cleanAppImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '/logo.svg';
  let trimmed = url.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return '/logo.svg';

  // Already a data URL, local path, or SVG
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return trimmed;
  }

  // If missing protocol (e.g. "i.imgur.com/abc.png" or "drive.google.com/...")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }

  // Google Drive share link -> direct thumbnail/image link
  // Formats:
  // - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // - https://drive.google.com/open?id=FILE_ID
  // - https://docs.google.com/uc?id=FILE_ID
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    const fileIdMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }

  // Dropbox link -> raw direct image
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace(/[?&]dl=0$/, '').concat(trimmed.includes('?') ? '&raw=1' : '?raw=1');
  }

  // Imgur page link -> direct image link
  // e.g. https://imgur.com/abc1234 -> https://i.imgur.com/abc1234.png
  if (trimmed.includes('imgur.com') && !trimmed.includes('i.imgur.com')) {
    const imgurMatch = trimmed.match(/imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)/);
    if (imgurMatch && imgurMatch[1]) {
      return `https://i.imgur.com/${imgurMatch[1]}.png`;
    }
  }

  // Google Image search redirect URL
  if (trimmed.includes('google.com/imgres') || trimmed.includes('google.com/url')) {
    try {
      const u = new URL(trimmed);
      const direct = u.searchParams.get('imgurl') || u.searchParams.get('url');
      if (direct) return direct;
    } catch {}
  }

  return trimmed;
}

// Generates a server-side proxy URL for external images that might suffer from hotlinking or CORS blocks
export function getProxiedImageUrl(originalUrl?: string | null): string {
  if (!originalUrl || typeof originalUrl !== 'string') return '/logo.svg';
  const clean = cleanAppImageUrl(originalUrl);
  if (clean.startsWith('data:') || clean.startsWith('/') || clean.startsWith('./')) {
    return clean;
  }
  return `/api/proxy-image?url=${encodeURIComponent(clean)}`;
}

// Preset app icons for 1-click selection in admin / app creation
export interface PresetIcon {
  name: string;
  category: string;
  url: string;
}

export const PRESET_APP_ICONS: PresetIcon[] = [
  {
    name: 'NADHILI AI Core',
    category: 'AI Tools',
    url: '/logo.svg',
  },
  {
    name: 'WhatsApp Pro Bot',
    category: 'Android APK',
    url: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=256&auto=format&fit=crop&q=80',
  },
  {
    name: 'Video & Media VIP',
    category: 'Media Editing',
    url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=256&auto=format&fit=crop&q=80',
  },
  {
    name: 'Security & VPN Fast',
    category: 'Security & VPN',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=256&auto=format&fit=crop&q=80',
  },
  {
    name: 'Developer Code Studio',
    category: 'Productivity',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=256&auto=format&fit=crop&q=80',
  },
  {
    name: 'Gaming & Mod Ultra',
    category: 'Gaming & Mods',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=256&auto=format&fit=crop&q=80',
  },
];

// Client-side helper to read and compress image file to lightweight base64 data URI
export function fileToCompressedDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use webp or png for crisp icon graphics
        const compressed = canvas.toDataURL('image/webp', 0.88);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
