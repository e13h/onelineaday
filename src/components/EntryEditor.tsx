import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

interface EntryEditorProps {
  date: string;
  initialMessage: string;
  onSave: (date: string, message: string) => Promise<void>;
  isSaving: boolean;
}

export default function EntryEditor({
  date,
  initialMessage,
  onSave,
  isSaving,
}: EntryEditorProps) {
  const [message, setMessage] = useState(initialMessage);
  const [hasChanged, setHasChanged] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setMessage(initialMessage);
    setHasChanged(false);
  }, [date, initialMessage]);

  // Auto-save effect for new entries
  useEffect(() => {
    if (message !== initialMessage && !isSaving) {
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set a new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(async () => {
        await onSave(date, message.trim());
        setHasChanged(false);
      }, 2000);
    }

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [message, initialMessage, isSaving, date, onSave]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    setHasChanged(newMessage !== initialMessage);
  };

  const handleBlur = async () => {
    // If there are unsaved changes and we're not currently saving, save immediately
    if (message !== initialMessage && !isSaving) {
      // Clear any pending auto-save timeout since we're saving now
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = undefined;
      }
      await onSave(date, message.trim());
      setHasChanged(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <textarea
        value={message}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="What's on your mind today?"
        className="w-full p-6 text-slate-700 placeholder-slate-400 focus:outline-none resize-none"
        rows={6}
      />

      <div className="px-6 pb-4 flex items-center border-t border-slate-200">
        {message === initialMessage && message.trim() === '' && (
          <p className="text-xs text-slate-500">Start typing to save automatically</p>
        )}
        {hasChanged && !isSaving && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Check size={14} />
            Changes made
          </div>
        )}
        {isSaving && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
            Saving...
          </div>
        )}
        {!hasChanged && !isSaving && message.trim() !== '' && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Check size={14} />
            Saved
          </div>
        )}
      </div>
    </div>
  );
}
