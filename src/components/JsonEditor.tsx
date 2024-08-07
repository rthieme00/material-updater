import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Edit2, Save, X } from 'lucide-react';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JsonEditorProps {
  data: JsonValue;
  onSave: (data: JsonValue) => void;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ data, onSave }) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [jsonData, setJsonData] = useState<JsonValue>(data);

  useEffect(() => {
    setJsonData(data);
  }, [data]);

  const toggleExpand = (key: string) => {
    const newExpandedKeys = new Set(expandedKeys);
    if (newExpandedKeys.has(key)) {
      newExpandedKeys.delete(key);
    } else {
      newExpandedKeys.add(key);
    }
    setExpandedKeys(newExpandedKeys);
  };

  const handleEdit = (key: string, value: JsonValue) => {
    setEditingKey(key);
    setEditingValue(JSON.stringify(value));
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editingValue);
      setJsonData((prevData: any) => {
        const newData = { ...prevData };
        const keys = editingKey!.split('.');
        let current: any = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = parsed;
        return newData;
      });
      setEditingKey(null);
    } catch (error) {
      alert('Invalid JSON. Please check your input.');
    }
  };

  const renderValue = (value: JsonValue, path: string): JSX.Element => {
    if (typeof value === 'object' && value !== null) {
      const isArray = Array.isArray(value);
      return (
        <div className="pl-4">
          <span className="text-gray-500">{isArray ? '[' : '{'}</span>
          {expandedKeys.has(path) && (
            <div className="pl-4">
              {Object.entries(value).map(([key, val], index) => (
                <div key={`${path}.${key}`} className="my-1">
                  {renderNode(`${path}.${key}`, key, val)}
                  {index < Object.entries(value).length - 1 && <span className="text-gray-500">,</span>}
                </div>
              ))}
            </div>
          )}
          <span className="text-gray-500">{isArray ? ']' : '}'}</span>
        </div>
      );
    }
    return <span className="text-green-600">{JSON.stringify(value)}</span>;
  };

  const renderNode = (path: string, key: string, value: JsonValue): JSX.Element => {
    const isObject = typeof value === 'object' && value !== null;
    return (
      <div className="flex items-center">
        {isObject && (
          <button onClick={() => toggleExpand(path)} className="mr-2 focus:outline-none">
            {expandedKeys.has(path) ? (
              <ChevronDown size={16} className="text-gray-500" />
            ) : (
              <ChevronRight size={16} className="text-gray-500" />
            )}
          </button>
        )}
        <span className="font-bold mr-2 text-blue-600">{key}:</span>
        {editingKey === path ? (
          <div className="flex items-center">
            <input
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="border rounded px-2 py-1 mr-2"
            />
            <button onClick={handleSave} className="text-green-500 mr-2">
              <Save size={16} />
            </button>
            <button onClick={() => setEditingKey(null)} className="text-red-500">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            {renderValue(value, path)}
            <button onClick={() => handleEdit(path, value)} className="ml-2 text-gray-500 hover:text-blue-500">
              <Edit2 size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded shadow overflow-auto max-h-[600px] border border-gray-200">
      <div className="mb-4 font-mono text-sm">{renderNode('root', 'root', jsonData)}</div>
      <button
        onClick={() => onSave(jsonData)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Save All Changes
      </button>
    </div>
  );
};

export default JsonEditor;