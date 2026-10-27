import { useState } from 'react';
import { formatClock, type EventType, type MatchState } from '../../engine';
import { Segmented, Sheet } from '../components/ui';

type Filter = 'all' | 'key';

const MINOR: EventType[] = ['point', 'lineup'];

export function LogSheet({ match, onClose }: { match: MatchState; onClose: () => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const events = [...match.events].reverse().filter((e) => filter === 'all' || !MINOR.includes(e.type));
  return (
    <Sheet title={`Journal (${match.events.length})`} onClose={onClose} wide>
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        className="mb-3"
        options={[
          { value: 'all', label: 'Tout' },
          { value: 'key', label: 'Sans les points' },
        ]}
      />
      <ol className="flex flex-col">
        {events.map((e) => (
          <li key={e.id} className="flex gap-3 border-b border-line py-2 text-sm last:border-0">
            <span className="tabular w-16 shrink-0 text-muted">{formatClock(e.at)}</span>
            <span className="tabular w-16 shrink-0 font-bold">
              {e.set ? (
                <>
                  <span className="text-muted">S{e.set} </span>
                  {e.score ? `${e.score.A}–${e.score.B}` : ''}
                </>
              ) : (
                '—'
              )}
            </span>
            <span className={`min-w-0 flex-1 ${e.type === 'point' ? '' : 'font-semibold'}`}>{e.text}</span>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
