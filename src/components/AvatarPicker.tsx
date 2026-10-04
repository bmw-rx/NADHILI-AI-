import React, { useState } from 'react';
import { RefreshCw, Check, Sparkles, User } from 'lucide-react';

interface AvatarPickerProps {
  selectedAvatar: string;
  onSelectAvatar: (avatarUrl: string) => void;
  className?: string;
}

const DEFAULT_SEEDS = [
  'Nadhili',
  'Baraka',
  'Zuri',
  'Felix',
  'Aneka',
  'Avery',
  'Zoe',
  'Leo',
  'Maya',
  'Amara',
  'Malik',
  'Juma',
];

export const getDicebearUrl = (seed: string): string => {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
};

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  selectedAvatar,
  onSelectAvatar,
  className = '',
}) => {
  const [seeds, setSeeds] = useState<string[]>(DEFAULT_SEEDS);
  const [isRotating, setIsRotating] = useState(false);

  const handleRandomize = () => {
    setIsRotating(true);
    const newSeeds = Array.from({ length: 12 }, () =>
      'avatar_' + Math.random().toString(36).substring(2, 9)
    );
    setSeeds(newSeeds);
    // Automatically select the first of the newly generated ones
    onSelectAvatar(getDicebearUrl(newSeeds[0]));
    setTimeout(() => setIsRotating(false), 400);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#da7756]" />
          <span>Chagua Avatar ya Wasifu (Profile Avatar)</span>
        </label>
        <button
          type="button"
          onClick={handleRandomize}
          className="text-[11px] text-[#da7756] hover:text-[#f5a623] flex items-center gap-1 font-medium px-2 py-0.5 rounded-md hover:bg-[#da7756]/10 transition"
          title="Tengeneza avatar mpya bila mpangilio"
        >
          <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
          <span>Changanya Mpya</span>
        </button>
      </div>

      {/* Selected Avatar Preview */}
      <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#1d1d1b] border border-[#33332f]">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#2a2a26] border-2 border-[#da7756] shadow-[0_0_12px_rgba(218,119,86,0.4)] shrink-0">
          {selectedAvatar ? (
            <img
              src={selectedAvatar}
              alt="Selected Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback in case of network issue
                (e.target as any).src = getDicebearUrl('fallback');
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400">
              <User className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white">Avatar Uliyochagua</p>
          <p className="text-[10px] text-neutral-400 truncate">
            {selectedAvatar || 'Bofya avatar hapa chini unayopenda'}
          </p>
        </div>
      </div>

      {/* Grid of Avatars */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1.5 rounded-xl bg-[#171715] border border-[#2b2b27] custom-scrollbar">
        {seeds.map((seed) => {
          const avatarUrl = getDicebearUrl(seed);
          const isSelected = selectedAvatar === avatarUrl;
          return (
            <button
              key={seed}
              type="button"
              onClick={() => onSelectAvatar(avatarUrl)}
              className={`relative group aspect-square rounded-xl p-1 transition-all duration-150 flex items-center justify-center ${
                isSelected
                  ? 'bg-[#da7756]/20 border-2 border-[#da7756] scale-105 shadow-md shadow-[#da7756]/20'
                  : 'bg-[#222220] border border-[#33332e] hover:border-neutral-400 hover:bg-[#282825]'
              }`}
              title={`Chagua avatar: ${seed}`}
            >
              <img
                src={avatarUrl}
                alt={`Avatar ${seed}`}
                className="w-full h-full object-contain rounded-lg transition-transform group-hover:scale-110"
                loading="lazy"
              />
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#da7756] text-white rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-neutral-500 text-center">
        Bofya avatar yoyote ili kuweka kama picha yako ya wasifu.
      </p>
    </div>
  );
};
export default AvatarPicker;
