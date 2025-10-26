import React from "react";
import { Artifact } from "../types";

interface FinalResponseProps {
  artifacts?: Artifact[] | null;
}

const FinalResponse: React.FC<FinalResponseProps> = ({ artifacts }) => {
  if (!artifacts || artifacts.length === 0) {
    return <div className="p-4 text-content-200">No final artifacts produced.</div>;
  }
  return (
    <div className="space-y-3">
      {artifacts.map((f, i) => (
        <div key={`${f.name}-${i}`} className="p-4 bg-base-200 border border-base-300 rounded-lg">
          <div className="text-sm text-content-200">{f.language}</div>
          <h3 className="font-semibold text-white">{f.name}</h3>
          <pre className="mt-2 text-sm overflow-auto">{f.content}</pre>
        </div>
      ))}
    </div>
  );
};

export default FinalResponse;
