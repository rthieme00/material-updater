interface VariantCheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }
  
  export default function VariantCheckbox({ label, checked, onChange }: VariantCheckboxProps) {
    return (
      <div className="flex items-center mb-4">
        <input
          id={label}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor={label} className="ml-2 block text-sm text-black">
          {label}
        </label>
      </div>
    );
  }