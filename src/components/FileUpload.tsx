import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  label: string;
  onFileSelect: (files: File | File[] | null) => void;
  multiple?: boolean;
  activeFileName: string;
}

export default function FileUpload({ label, onFileSelect, multiple = false, activeFileName }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileSelect(multiple ? acceptedFiles : acceptedFiles[0]);
  }, [multiple, onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(multiple ? [] : null);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        {...getRootProps()}
        className={`p-4 border-2 border-dashed rounded-md ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-center text-black">
          {activeFileName || "Drag 'n' drop files here, or click to select files"}
        </p>
      </div>
      <button
        onClick={handleClear}
        className="mt-2 px-3 py-1 bg-gray-400 text-white rounded hover:bg-red-600"
      >
        Clear
      </button>
    </div>
  );
}