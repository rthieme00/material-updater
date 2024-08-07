import { useState, useEffect } from 'react';

interface ModelSelectorProps {
  onSelect: (model: string) => void;
}

export default function ModelSelector({ onSelect }: ModelSelectorProps) {
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/get-models')
      .then(response => response.json())
      .then(data => setModels(data.models));
  }, []);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-black mb-2">Select Model</label>
      <select
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-black bg-white"
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">Select a model</option>
        {models.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </div>
  );
}