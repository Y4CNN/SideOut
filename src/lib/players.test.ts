import { describe, it, expect, vi } from 'vitest';
import { addPlayer, cleanPlayers, migratePlayers, setPlayerRole } from './players';
import { load } from './storage';
import { createMatch, FFVB_6X6, summaryJson } from '../engine';

describe('saisie des numéros', () => {
  it('ajoute en série sans perdre les rôles et refuse les doublons', () => {
    const first = [{ number: 8, captain: true }];
    const added = addPlayer(first, '09');
    expect(added.players).toEqual([{ number: 8, captain: true }, { number: 9 }]);
    expect(addPlayer(added.players, '9').error).toContain('déjà');
    expect(addPlayer(added.players, '9').players).toBe(added.players);
    expect(first).toHaveLength(1);
  });
  it.each(['', '0', '100', '-1', 'a', '1.5', '1 2'])('refuse %j', raw => {
    expect(addPlayer([], raw).error).toBeTruthy();
  });
  it('accepte les bornes 1 et 99', () => {
    expect(addPlayer(addPlayer([], '1').players, '99').players.map(p => p.number)).toEqual([1,99]);
  });
  it('désigne un seul capitaine et limite les libéros selon le format', () => {
    const players = [{ number: 1, captain: true }, { number: 2 }];
    const captain = setPlayerRole(players, 2, 'captain', 1).players;
    expect(captain.filter(p => p.captain).map(p => p.number)).toEqual([2]);
    const lib = setPlayerRole(captain, 1, 'libero', 1).players;
    expect(setPlayerRole(lib, 2, 'libero', 1).error).toBeTruthy();
    expect(setPlayerRole(lib, 1, 'libero', 1).players.some(p => p.libero)).toBe(false);
    expect(setPlayerRole(players, 1, 'libero', 0).error).toBeTruthy();
  });
});
describe('migration des anciens effectifs', () => {
  const legacy = { teams: { A: { name: 'Lyon', players: [{ number: 7, name: 'Jean Dupont', firstName: 'Jean', lastName: 'Dupont', captain: true, libero: false }] } }, events: [{ text: 'n°7 (Jean Dupont) entre.' }] };
  it('préserve les numéros et rôles, retire les identités et les anciens libellés', () => {
    const migrated = migratePlayers(legacy);
    expect(migrated.teams.A.name).toBe('Lyon');
    expect(migrated.teams.A.players).toEqual([{ number: 7, captain: true, libero: false }]);
    expect(migrated.events[0].text).toBe('n°7 entre.');
    expect(migratePlayers(migrated)).toEqual(migrated);
    expect(legacy.teams.A.players[0].name).toBe('Jean Dupont');
  });
  it('traite les historiques, favoris, archives et effectifs vides', () => {
    const data = migratePlayers({ base: legacy, archive: [{ state: legacy }], favorites: [legacy.teams.A] });
    expect(JSON.stringify(data)).not.toContain('Dupont');
    expect(cleanPlayers(null)).toEqual([]);
  });
  it('retire les identités des exports sans modifier le match en mémoire', () => {
    const team = { ...legacy.teams.A, color: '#0A2A66' };
    const match = createMatch(FFVB_6X6, {A:team, B:{...team,name:'Paris'}}, 1000);
    match.events.push({id:2,at:1001,set:null,score:null,type:'substitution',text:'n°7 (Jean Dupont) entre.'});
    const before = structuredClone(match);
    const json = summaryJson(match);
    expect(json).not.toContain('Dupont');
    expect(JSON.parse(json).teams.A.players).toEqual([{number:7,captain:true,libero:false}]);
    expect(match).toEqual(before);
  });
  it('réécrit le stockage sans noms et reste lisible si le stockage est en lecture seule', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(legacy), setItem });
    expect(load('va:match', null)).toEqual(migratePlayers(legacy));
    expect(setItem.mock.calls[0][1]).not.toContain('Dupont');
    setItem.mockImplementation(() => { throw new Error('quota'); });
    expect(load('va:match', null)).toEqual(migratePlayers(legacy));
    vi.stubGlobal('localStorage', { getItem: () => '{' });
    expect(load('va:match', null)).toBeNull();
    vi.unstubAllGlobals();
  });
});
