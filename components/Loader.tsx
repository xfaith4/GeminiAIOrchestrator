
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center my-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-secondary"></div>
      <p className="mt-4 text-content-200">Agents are processing your request...</p>
    </div>
  );
};

export default Loader;
