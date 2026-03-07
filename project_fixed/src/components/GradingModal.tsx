import { X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

interface GradingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GradingModal = ({ isOpen, onClose }: GradingModalProps) => {
  const conditionGrades = useAppStore((s) => s.conditionGrades);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card border border-border rounded-lg z-50 animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display text-lg text-primary">Grading Guide</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {conditionGrades.map((grade) => (
            <div key={grade.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-7 h-7 rounded border border-primary flex items-center justify-center text-sm font-semibold text-primary">
                  {grade.code}
                </span>
                <span className="text-sm font-medium text-foreground">{grade.name}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-9">{grade.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default GradingModal;
