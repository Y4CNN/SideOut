import { ArrowLeftRight, CircleAlert, Info, TriangleAlert, CircleCheck } from 'lucide-react';
import { useApp, type ToastKind } from '../../store/useApp';
import { Button } from './ui';
import { lastUndoableAction } from '../../store/history';

const TOAST_STYLE: Record<ToastKind, string> = {
  info: 'bg-surface-2 text-fg border-line',
  success: 'bg-surface text-fg border-ok',
  warning: 'bg-surface text-fg border-warn',
  error: 'bg-surface text-fg border-danger',
};

const TOAST_ICON = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const history = useApp(s => s.history);
  const undo = useApp(s => s.undo);
  const dismiss = useApp(s => s.dismissToast);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = TOAST_ICON[t.kind];
        return (
          // Non cliquable : un toucher doit toujours atteindre la zone d'équipe en dessous.
          <div
            key={t.id}
            role="status"
            className={`animate-sheet flex w-full max-w-md items-start gap-2 rounded-xl border px-3 py-2 text-left text-[15px] font-semibold shadow-xl ${TOAST_STYLE[t.kind]}`}
          >
            <Icon className="mt-0.5 size-5 shrink-0" />
            <span className="min-w-0 flex-1">{t.text}</span>
            {t.undoAction && history && lastUndoableAction(history) === t.undoAction && <button type="button" className="pointer-events-auto min-h-12 shrink-0 rounded-lg px-2 underline" onClick={() => {undo(); dismiss(t.id);}}>Annuler</button>}
          </div>
        );
      })}
    </div>
  );
}

/** Alerte plein écran : changement de côté au set décisif. */
export function BigAlert() {
  const text = useApp((s) => s.bigAlert);
  const clear = useApp((s) => s.clearBigAlert);
  if (!text) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Changement de côté" className="animate-fade fixed inset-0 z-[55] flex flex-col items-center justify-center gap-4 bg-ffred p-6 text-center text-white">
      <ArrowLeftRight className="size-20" strokeWidth={2.5} />
      <div className="text-4xl font-black uppercase tracking-wide">Changement de côté</div>
      <div className="max-w-md text-lg font-semibold">{text}</div>
      <Button variant="secondary" className="min-w-48 !bg-white !text-black" onClick={clear}>
        OK
      </Button>
    </div>
  );
}
