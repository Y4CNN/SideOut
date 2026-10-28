import { useEffect } from 'react';
import { useApp } from '../../store/useApp';

let modalId = 0;

/** Focus follows the topmost modal, returns to its trigger and never escapes it. */
export function Accessibility() {
  const match = useApp(s => s.match);
  const set = match?.sets.at(-1);
  useEffect(() => {
    let current: HTMLElement | null = null;
    const triggers = new Map<HTMLElement, HTMLElement | null>();
    const focusable = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(e => e.getClientRects().length > 0);
    const sync = () => {
      const modals = [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')];
      const top = modals.at(-1) ?? null;
      if (top === current) return;
      const previous = current;
      current = top;
      if (top) {
        top.tabIndex = -1;
        const heading = top.querySelector<HTMLElement>('h2, h3');
        if (heading && !top.hasAttribute('aria-labelledby')) {
          if (!heading.id) heading.id = `volley-modal-title-${++modalId}`;
          top.setAttribute('aria-labelledby', heading.id);
        }
        if (!triggers.has(top)) triggers.set(top, document.activeElement as HTMLElement | null);
        const restore = previous && triggers.get(previous);
        if (previous && !previous.isConnected && restore && top.contains(restore)) restore.focus();
        else (focusable(top)[0] ?? top).focus();
      } else if (previous) {
        const trigger = triggers.get(previous);
        if (trigger?.isConnected) trigger.focus();
      }
    };
    const key = (e: KeyboardEvent) => {
      if (!current) return;
      if (e.key === 'Escape') {
        const cancel = [...current.querySelectorAll<HTMLButtonElement>('button')].find(b => b.title === 'Fermer' || b.textContent?.trim() === 'Annuler');
        if (cancel) {e.preventDefault(); cancel.click();}
      }
      if (e.key !== 'Tab') return;
      const items = focusable(current), first = items[0], last = items.at(-1);
      if (!first) { e.preventDefault(); current.focus(); return; }
      if (e.shiftKey && (document.activeElement === first || !current.contains(document.activeElement))) {e.preventDefault(); last?.focus();}
      else if (!e.shiftKey && (document.activeElement === last || !current.contains(document.activeElement))) {e.preventDefault(); first.focus();}
    };
    const focus = (e: FocusEvent) => { if (current && !current.contains(e.target as Node)) focusable(current)[0]?.focus(); };
    const observer = new MutationObserver(sync);
    observer.observe(document.getElementById('root')!, {childList:true, subtree:true});
    document.addEventListener('keydown', key);
    document.addEventListener('focusin', focus);
    sync();
    return () => {observer.disconnect(); document.removeEventListener('keydown', key); document.removeEventListener('focusin', focus);};
  }, []);
  const text = match && set ? `${match.teams.A.name} ${set.score.A}, ${match.teams.B.name} ${set.score.B}. ${match.phase === 'playing' ? `Service ${match.teams[set.serving].name}, numéro ${set.teams[set.serving].court[0]}.` : `Set ${set.number} terminé.${match.phase === 'finished' ? ' Match terminé.' : ''}`}` : '';
  return <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{text}</div>;
}
