interface UpdateButtonProps {
    onClick: () => void;
  }
  
  export default function UpdateButton({ onClick }: UpdateButtonProps) {
    return (
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={onClick}
      >
        Update Materials
      </button>
    );
  }