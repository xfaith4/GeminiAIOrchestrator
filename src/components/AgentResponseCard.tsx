import React from "react";

interface AgentResponseCardProps {
  agent?: string;
  title?: string;
  text?: string;
}

const AgentResponseCard: React.FC<AgentResponseCardProps> = ({ agent = "Agent", title = "Response", text = "No content." }) => {
  return (
    <div className="p-4 bg-base-200 border border-base-300 rounded-lg">
      <div className="text-sm text-content-200">{agent}</div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-content-100 mt-1 whitespace-pre-wrap">{text}</p>
    </div>
  );
};

export default AgentResponseCard;
