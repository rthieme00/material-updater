// src/components/FileUpload/FileUpload.tsx

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept: string;
  label?: string;
  selectedFileName?: string;
}

export default function FileUpload({ onFileSelect, accept, label, selectedFileName }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { [accept]: [] } });

  return (
    <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <input {...getInputProps()} />
      {selectedFileName ? (
        <p>{selectedFileName}</p>
      ) : isDragActive ? (
        <p>Drop the file here ...</p>
      ) : (
        <p>{label || `Drag 'n' drop a file here, or click to select a file`}</p>
      )}
      <Button className="mt-4">Select File</Button>
    </div>
  );
}