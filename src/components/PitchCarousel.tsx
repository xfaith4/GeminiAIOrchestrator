import React from "react";

interface PitchCarouselProps {
  items?: string[];
  onPick?: (value: string) => void;
}

const PitchCarousel: React.FC<PitchCarouselProps> = ({ items = [], onPick }) => {
  if (items.length === 0) return <div className="text-content-200 text-sm">No suggestions.</div>;
  return (
    <div className="flex gap-2 overflow-x-auto">
      {items.map((t, i) => (
        <button
          key={`${i}-${t.slice(0,20)}`}
          onClick={() => onPick?.(t)}
          className="px-3 py-2 bg-base-200 border border-base-300 rounded-md hover:bg-base-300 text-sm"
          title={t}
        >
          {t}
        </button>
      ))}
    </div>
  );
};

export default PitchCarousel;
