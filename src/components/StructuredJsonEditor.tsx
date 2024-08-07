import React, { useState } from 'react';
import { ChevronLeft, Plus, Trash } from 'lucide-react';

interface StructuredJsonEditorProps {
  data: any;
  onSave: (data: any) => void;
}

const StructuredJsonEditor: React.FC<StructuredJsonEditorProps> = ({ data, onSave }) => {
  const [activeSection, setActiveSection] = useState<string[]>([]);
  const [editedData, setEditedData] = useState(data);

  const handleSectionClick = (section: string) => {
    setActiveSection([...activeSection, section]);
  };

  const handleBack = () => {
    setActiveSection(activeSection.slice(0, -1));
  };

  const handleInputChange = (path: string[], index: number | string, value: any) => {
    setEditedData((prevData: any) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      let current = newData;
      for (let i = 0; i < path.length; i++) {
        if (i === path.length - 1) {
          if (Array.isArray(current[path[i]])) {
            current[path[i]][index as number] = value;
          } else {
            current[path[i]][index as string] = value;
          }
        } else {
          current = current[path[i]];
        }
      }
      return newData;
    });
  };

  const handleAddItem = (path: string[]) => {
    setEditedData((prevData: any) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      let current = newData;
      for (let i = 0; i < path.length; i++) {
        if (i === path.length - 1) {
          if (Array.isArray(current[path[i]])) {
            current[path[i]].push('');
          } else {
            const newKey = prompt('Enter new key:');
            if (newKey) {
              current[path[i]][newKey] = '';
            }
          }
        } else {
          current = current[path[i]];
        }
      }
      return newData;
    });
  };

  const handleRemoveItem = (path: string[], index: number | string) => {
    setEditedData((prevData: any) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      let current = newData;
      for (let i = 0; i < path.length; i++) {
        if (i === path.length - 1) {
          if (Array.isArray(current[path[i]])) {
            current[path[i]].splice(index as number, 1);
          } else {
            delete current[path[i]][index as string];
          }
        } else {
          current = current[path[i]];
        }
      }
      return newData;
    });
  };

  const handleSave = () => {
    onSave(editedData);
  };

  const renderContent = () => {
    let content = editedData;
    for (const section of activeSection) {
      content = content[section];
    }

    if (Array.isArray(content)) {
      return (
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">Index</th>
              <th className="px-4 py-2 border-b">Value</th>
              <th className="px-4 py-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {content.map((item, index) => (
              <tr key={index}>
                <td className="px-4 py-2 border-b">{index}</td>
                <td className="px-4 py-2 border-b">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleInputChange(activeSection, index, e.target.value)}
                    className="w-full p-1 border rounded text-black"
                  />
                </td>
                <td className="px-4 py-2 border-b">
                  <button onClick={() => handleRemoveItem(activeSection, index)} className="text-red-500">
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (typeof content === 'object' && content !== null) {
      return (
        <div>
          {Object.keys(content).map((key) => (
            <button
              key={key}
              onClick={() => handleSectionClick(key)}
              className="px-4 py-2 m-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {key}
            </button>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex items-center mb-4">
        {activeSection.length > 0 && (
          <button onClick={handleBack} className="mr-2 text-blue-500">
            <ChevronLeft size={24} />
          </button>
        )}
        <h3 className="text-xl font-semibold text-black">
          {activeSection.length > 0 ? activeSection.join(' > ') : 'Root'}
        </h3>
      </div>
      {renderContent()}
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => handleAddItem(activeSection)}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        >
          <Plus size={16} className="inline mr-2" />
          Add Item
        </button>
        <button
          onClick={handleSave}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default StructuredJsonEditor;