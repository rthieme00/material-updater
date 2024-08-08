// src/components/MaterialEditor.tsx

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MaterialData } from '@/types/material';

interface MaterialEditorProps {
  data: MaterialData;
  onSave: (data: MaterialData) => void;
}

export default function MaterialEditor({ data, onSave }: MaterialEditorProps) {
  const [editedData, setEditedData] = useState<MaterialData>(data);

  useEffect(() => {
    setEditedData(data);
  }, [data]);

  const handleChange = (key: string, value: any) => {
    setEditedData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(editedData);
  };

  return (
    <div className="space-y-4">
      {Object.entries(editedData).map(([key, value]) => (
        <div key={key}>
          <Label htmlFor={key}>{key}</Label>
          <Input
            id={key}
            value={JSON.stringify(value)}
            onChange={(e) => handleChange(key, JSON.parse(e.target.value))}
          />
        </div>
      ))}
      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  );
}