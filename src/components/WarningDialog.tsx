// src/components/WarningDialog.tsx

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string[];
}

const WarningDialog: React.FC<WarningDialogProps> = ({ isOpen, onClose, message }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Warning</DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-2 max-h-[300px] overflow-y-auto">
          <ul className="list-disc pl-5 space-y-2">
            {message.map((item, index) => (
              <li key={index} className="text-sm">{item}</li>
            ))}
          </ul>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WarningDialog;