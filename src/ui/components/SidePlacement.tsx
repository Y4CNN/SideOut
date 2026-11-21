import { ArrowLeftRight } from 'lucide-react';
import { leftTeam, other, type MatchState } from '../../engine';
import { textOn } from '../../lib/color';
import { useApp } from '../../store/useApp';
import { IconButton } from './ui';

export function SidePlacement({ match }: { match: MatchState }) {
  const dispatch = useApp(s => s.dispatch);
  const left = leftTeam(match);
  return (
    <div className="flex items-center gap-2" aria-label="Placement des équipes">
      {[left, other(left)].map((team, i) => (
        <div key={i} className="min-w-0 flex-1 text-center">
          <div className="mb-1 text-sm text-muted">{i === 0 ? 'Gauche' : 'Droite'}</div>
          <div className="truncate rounded-lg px-2 py-2 font-bold" style={{ background: match.teams[team].color, color: textOn(match.teams[team].color) }}>
            {match.teams[team].name}
          </div>
        </div>
      ))}
      <IconButton label="Inverser les côtés" onClick={() => dispatch({ type: 'SET_SIDES', leftTeam: other(left) })}>
        <ArrowLeftRight />
      </IconButton>
    </div>
  );
}
