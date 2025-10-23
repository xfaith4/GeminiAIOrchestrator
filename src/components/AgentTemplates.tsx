import React from "react";

type Template = { name: string; description?: string; prompt?: string };

interface AgentTemplatesProps {
  templates?: Template[];
  onUse?: (t: Template) => void;
}

const AgentTemplates: React.FC<AgentTemplatesProps> = ({
  templates = [{ name: "Default Plan", description: "Basic multi-step planning template." }],
  onUse,
}) => {
  return (
    <div className="space-y-2">
      {templates.map((t, i) => (
        <div key={`${t.name}-${i}`} className="p-3 bg-base-200 border border-base-300 rounded-md flex items-center justify-between">
          <div>
            <div className="font-semibold text-white">{t.name}</div>
            {t.description && <div className="text-xs text-content-200">{t.description}</div>}
          </div>
          <button className="px-3 py-1.5 bg-brand-secondary hover:bg-brand-primary text-white rounded-md" onClick={() => onUse?.(t)}>
            Use
          </button>
        </div>
      ))}
    </div>
  );
};

export default AgentTemplates;
