import React from 'react';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "Agents are processing your request..." }) => {
  return (
    <div className="flex flex-col items-center justify-center my-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-secondary"></div>
      <p className="mt-4 text-content-200">{message}</p>
    </div>
  );
};

export default Loader;