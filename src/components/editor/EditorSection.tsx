import React from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EditorSectionProps {
  children: React.ReactNode;
  className?: string;
}

const EditorSection: React.FC<EditorSectionProps> = ({ children, className }) => {
  return (
    <Card className={cn(
      "p-6 bg-gray-50 dark:bg-gray-900 border-none shadow-none",
      className
    )}>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="pr-4">
          {children}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default EditorSection;