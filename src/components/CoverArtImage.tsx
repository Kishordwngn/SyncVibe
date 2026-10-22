import React, { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface CoverArtImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const CoverArtImage: React.FC<CoverArtImageProps> = ({
  src,
  alt,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#FF2E63]/40 via-[#181826] to-[#8B5CF6]/40 text-white ${className}`}
        role="img"
        aria-label={alt}
      >
        <Disc3 className="w-1/3 h-1/3 text-[#FF2E63] opacity-90" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth > 0 && e.currentTarget.naturalWidth <= 120) {
          setHasError(true);
        }
      }}
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
};
