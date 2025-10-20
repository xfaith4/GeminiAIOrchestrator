import React, { useState, useEffect } from 'react';

interface PitchCarouselProps {
  quotes: { title: string; text: string }[];
}

const PitchCarousel: React.FC<PitchCarouselProps> = ({ quotes }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % quotes.length);
        setIsFading(false);
      }, 500); // Corresponds to the CSS transition duration
    }, 7000); // Time each quote is displayed

    return () => clearInterval(interval);
  }, [quotes.length]);

  const currentQuote = quotes[currentIndex];

  return (
    <div className={`text-center my-4 h-10 flex items-center justify-center transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <p className="text-sm text-content-200">
        <span className="font-bold text-white">{currentQuote.title}:</span> {currentQuote.text}
      </p>
    </div>
  );
};

export default PitchCarousel;
