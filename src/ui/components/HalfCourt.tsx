import { POSITION_CONSTRAINTS, positionLabel } from '../../engine';
import { softOn, textOn } from '../../lib/color';

/**
 * Orientation du demi-terrain :
 * - left  : équipe à gauche de l'écran, filet à droite (vue depuis la chaise d'arbitre) ;
 * - right : équipe à droite, filet à gauche ;
 * - top   : filet en haut (équipe vue de derrière, pour la saisie de la feuille de position).
 */
export type CourtOrientation = 'left' | 'right' | 'top';

/** [colonne, ligne] de chaque position (index 0 = I … 5 = VI). */
function layout(orientation: CourtOrientation, flip: boolean): [number, number][] {
  // L'arbitre est en bas de l'écran : pour l'équipe de gauche (face au filet, vers la droite),
  // sa droite (I, II) est en bas ; pour l'équipe de droite, sa droite est en haut.
  const r = (row: number) => (flip ? 2 - row : row);
  if (orientation === 'left') {
    // col 0 = ligne arrière, col 1 = ligne avant (filet)
    return [
      [0, r(2)], // I
      [1, r(2)], // II
      [1, r(1)], // III
      [1, r(0)], // IV
      [0, r(0)], // V
      [0, r(1)], // VI
    ];
  }
  if (orientation === 'right') {
    // col 0 = ligne avant (filet), col 1 = ligne arrière
    return [
      [1, r(0)], // I
      [0, r(0)], // II
      [0, r(1)], // III
      [0, r(2)], // IV
      [1, r(2)], // V
      [1, r(1)], // VI
    ];
  }
  // top : ligne 0 = avant (IV III II de gauche à droite), ligne 1 = arrière (V VI I)
  return [
    [2, 1], // I
    [2, 0], // II
    [1, 0], // III
    [0, 0], // IV
    [0, 1], // V
    [1, 1], // VI
  ];
}

const CELL = 100;
const NET = 14;

export interface HalfCourtProps {
  court: (number | null)[];
  orientation: CourtOrientation;
  flip?: boolean;
  color: string;
  libero?: number | null;
  server?: number | null;
  selected?: number | null;
  /** Index de positions à mettre en évidence (alerte). */
  alert?: number[];
  showConstraints?: boolean;
  onCellClick?: (index: number) => void;
  className?: string;
  /** Sur fond de couleur d'équipe : cellules translucides. */
  onTeamColor?: boolean;
  label?: string;
}

export function HalfCourt({
  court,
  orientation,
  flip = false,
  color,
  libero,
  server,
  selected,
  alert = [],
  showConstraints = false,
  onCellClick,
  className = '',
  onTeamColor = false,
  label,
}: HalfCourtProps) {
  const pos = layout(orientation, flip);
  const vertical = orientation !== 'top';
  const cols = vertical ? 2 : 3;
  const rows = vertical ? 3 : 2;
  const netOffset = { x: orientation === 'right' ? NET : 0, y: orientation === 'top' ? NET : 0 };
  const width = cols * CELL + (vertical ? NET : 0);
  const height = rows * CELL + (vertical ? 0 : NET);
  const fg = onTeamColor ? textOn(color) : 'currentColor';
  const cellFill = onTeamColor ? softOn(color, 0.16) : color;
  const cellText = onTeamColor ? textOn(color) : textOn(color);

  const inset = showConstraints ? 13 : 5;
  const center = (i: number) => {
    const [c, r] = pos[i];
    return { x: netOffset.x + c * CELL + CELL / 2, y: netOffset.y + r * CELL + CELL / 2 };
  };

  // filet
  const net =
    orientation === 'left'
      ? { x: cols * CELL, y: 0, w: NET, h: height }
      : orientation === 'right'
        ? { x: 0, y: 0, w: NET, h: height }
        : { x: 0, y: 0, w: width, h: NET };

  // ligne d'attaque (entre ligne avant et ligne arrière)
  const attack =
    orientation === 'left'
      ? { x1: CELL, y1: 0, x2: CELL, y2: height }
      : orientation === 'right'
        ? { x1: NET + CELL, y1: 0, x2: NET + CELL, y2: height }
        : { x1: 0, y1: NET + CELL, x2: width, y2: NET + CELL };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`block select-none ${className}`}
      role="img"
      aria-label={label ?? 'Positions sur le terrain'}
    >
      <rect x={net.x} y={net.y} width={net.w} height={net.h} rx={3} fill={fg} opacity={0.85} />
      <line {...attack} stroke={fg} strokeWidth={3} strokeDasharray="10 7" opacity={0.55} />

      {showConstraints &&
        POSITION_CONSTRAINTS.map((c, k) => {
          const a = center(c.a);
          const b = center(c.b);
          return (
            <line
              key={k}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={c.kind === 'front-back' ? '#ffb547' : '#6fd3ff'}
              strokeWidth={9}
              strokeLinecap="round"
              opacity={0.9}
            />
          );
        })}

      {court.map((n, i) => {
        const [c, r] = pos[i];
        const x = netOffset.x + c * CELL;
        const y = netOffset.y + r * CELL;
        const isLib = n !== null && n === libero;
        const isServer = n !== null && n === server;
        const isSel = selected === i;
        const isAlert = alert.includes(i);
        const fill = isLib ? '#FFD200' : cellFill;
        const txt = isLib ? '#0B0B0B' : cellText;
        const inner = (
          <g key={i}>
            <rect
              x={x + inset}
              y={y + inset}
              width={CELL - 2 * inset}
              height={CELL - 2 * inset}
              rx={14}
              fill={fill}
              stroke={isAlert ? '#ff5a63' : isSel ? '#6f9bff' : onTeamColor ? softOn(color, 0.4) : softOn(color, 0.5)}
              strokeWidth={isAlert || isSel ? 7 : 2}
            />
            <text x={x + inset + 8} y={y + inset + 21} fontSize={showConstraints ? 15 : 17} fontWeight={700} fill={txt} opacity={0.75}>
              {positionLabel(i)}
            </text>
            {isLib && (
              <text x={x + CELL - inset - 8} y={y + inset + 21} fontSize={showConstraints ? 15 : 17} fontWeight={800} fill={txt} textAnchor="end">
                L
              </text>
            )}
            <text
              x={x + CELL / 2}
              y={y + CELL / 2 + 17}
              fontSize={showConstraints ? 40 : n !== null && n > 9 ? 44 : 48}
              fontWeight={800}
              fill={txt}
              textAnchor="middle"
              className="tabular"
            >
              {n ?? '–'}
            </text>
            {isServer && (
              <g transform={`translate(${x + CELL - 22} ${y + CELL - 22})`}>
                <circle r={12} fill="#ffffff" stroke="#0B0B0B" strokeWidth={2} />
                <path d="M-12 0 Q 0 -4 8 -9 M-4 11 Q -2 0 4 -11 M 12 1 Q 2 2 -8 9" stroke="#0B0B0B" strokeWidth={2} fill="none" />
              </g>
            )}
          </g>
        );
        if (!onCellClick) return inner;
        return (
          <g
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`Position ${positionLabel(i)}${n ? ` : n°${n}` : ' : vide'}`}
            onClick={() => onCellClick(i)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCellClick(i)}
            style={{ cursor: 'pointer' }}
          >
            {inner}
          </g>
        );
      })}
    </svg>
  );
}
