import { useState, useEffect } from 'react';

export default function MaterialEditor() {
  const [materialJson, setMaterialJson] = useState('');

  useEffect(() => {
    fetch('/api/get-material-json')
      .then(response => response.json())
      .then(data => setMaterialJson(JSON.stringify(data, null, 2)));
  }, []);

  const handleSave = async () => {
    try {
      const response = await fetch('/api/update-material-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: materialJson,
      });

      if (response.ok) {
        alert('Materials.json updated successfully');
      } else {
        alert('Error updating Materials.json');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating Materials.json');
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4 text-black">Edit Materials.json</h2>
      <textarea
        className="w-full h-64 p-2 border rounded text-black bg-white"
        value={materialJson}
        onChange={(e) => setMaterialJson(e.target.value)}
      />
      <button
        className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleSave}
      >
        Save Changes
      </button>
    </div>
  );
}