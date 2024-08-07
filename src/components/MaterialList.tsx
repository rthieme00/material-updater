interface MaterialListProps {
    materials: File[];
  }
  
  export default function MaterialList({ materials }: MaterialListProps) {
    return (
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2 text-black">Selected Materials</h2>
        <ul className="list-disc pl-5 text-black">
          {materials.map((file, index) => (
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      </div>
    );
  }