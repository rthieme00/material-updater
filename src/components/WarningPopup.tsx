// src/components/WarningPopup.tsx

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WarningPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  differences: string[];
}

export default function WarningPopup({ isOpen, onClose, onContinue, differences }: WarningPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Warning: Material Differences Detected</DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-2 max-h-[300px] overflow-y-auto">
          <ul className="list-disc pl-5 space-y-2">
            {differences.map((diff, index) => (
              <li key={index} className="text-sm">{diff}</li>
            ))}
          </ul>
        </ScrollArea>
        <DialogFooter className="flex justify-between">
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={onContinue}>Continue Anyway</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}