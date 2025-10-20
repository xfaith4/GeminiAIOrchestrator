import React from 'react';
import { AgentTemplate, WorkerAgent } from '../types';
import { TemplateIcon } from './icons';

interface AgentTemplatesProps {
  templates: AgentTemplate[];
  onSelectTemplate: (agents: WorkerAgent[]) => void;
}

const AgentTemplates: React.FC<AgentTemplatesProps> = ({ templates, onSelectTemplate }) => {
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTemplateName = event.target.value;
    if (!selectedTemplateName) {
      return;
    }
    const selectedTemplate = templates.find(t => t.name === selectedTemplateName);
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate.agents);
    }
  };

  return (
    <div className="mb-6 p-4 bg-base-300/30 border border-base-300 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <TemplateIcon className="w-5 h-5 text-brand-secondary" />
        <h4 className="font-semibold text-white">Load an Agent Team Template</h4>
      </div>
      <p className="text-xs text-content-200 mb-3">
        Quickly load a pre-configured team of agents specialized for common IT tasks.
      </p>
      <select
        onChange={handleSelectChange}
        className="w-full bg-base-200/50 border border-base-300 rounded-md p-2 text-sm text-content-100 focus:ring-1 focus:ring-brand-secondary focus:border-transparent transition-shadow"
        aria-label="Select agent template"
        defaultValue=""
      >
        <option value="" disabled>Select a template...</option>
        {templates.map(template => (
          <option key={template.name} value={template.name}>
            {template.name} - {template.description}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AgentTemplates;
