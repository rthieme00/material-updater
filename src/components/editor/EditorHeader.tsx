import React from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Layout, Shapes, Eye } from 'lucide-react';

export type EditorSection = 'materials' | 'meshes' | 'variants';

interface EditorHeaderProps {
  activeSection: EditorSection | null;
  onSectionChange: (section: EditorSection) => void;
  isAutoSortEnabled?: boolean;
  onAutoSortToggle?: (enabled: boolean) => void;
  onOpenSortDialog?: () => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({ 
  activeSection,
  onSectionChange,
  isAutoSortEnabled,
  onAutoSortToggle,
  onOpenSortDialog
}) => {
  const sections = [
    {
      id: 'materials' as const,
      label: 'Materials',
      icon: <Layout className="w-4 h-4" />
    },
    {
      id: 'meshes' as const,
      label: 'Mesh Assignments',
      icon: <Shapes className="w-4 h-4" />
    },
    {
      id: 'variants' as const,
      label: 'Preview Variants',
      icon: <Eye className="w-4 h-4" />
    }
  ];

  return (
    <div className="flex items-center justify-between mb-4 pb-4 border-b">
      <div className="flex space-x-2">
        {sections.map(section => (
          <Button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            variant={activeSection === section.id ? "default" : "outline"}
            size="sm"
            className={cn(
              "w-32",
              "flex items-center gap-2"
            )}
          >
            {section.icon}
            <span>{section.label}</span>
          </Button>
        ))}
      </div>

      {activeSection === 'materials' && onAutoSortToggle && onOpenSortDialog && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={isAutoSortEnabled}
              onCheckedChange={onAutoSortToggle}
              className="data-[state=checked]:bg-blue-500"
            />
            <span className="text-sm text-gray-500">Auto-sort</span>
          </div>
          <Button 
            onClick={onOpenSortDialog}
            size="sm"
            variant="outline"
          >
            Sort Materials
          </Button>
        </div>
      )}
    </div>
  );
};

export default EditorHeader;