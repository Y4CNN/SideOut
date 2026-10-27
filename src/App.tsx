import { useEffect } from 'react';
import { useWakeLock } from './lib/wakeLock';
import { useApp } from './store/useApp';
import { BigAlert, Toasts } from './ui/components/Feedback';
import { TimerOverlay } from './ui/components/TimerOverlay';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { MatchScreen } from './ui/screens/MatchScreen';
import { PreSetScreen } from './ui/screens/PreSetScreen';
import { SetupScreen } from './ui/screens/SetupScreen';
import { SummaryScreen } from './ui/screens/SummaryScreen';

export function App() {
  const screen = useApp((s) => s.screen);
  const match = useApp((s) => s.match);
  const theme = useApp((s) => s.prefs.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0A2A66' : '#eef1f7');
  }, [theme]);

  const inGame = screen === 'game' && !!match;
  useWakeLock(inGame && match.phase !== 'finished');

  let content;
  if (screen === 'setup') content = <SetupScreen />;
  else if (screen === 'history') content = <HistoryScreen />;
  else if (inGame && match.phase === 'playing') content = <MatchScreen match={match} />;
  else if (inGame && match.phase === 'pre-set') content = <PreSetScreen key={match.sets.length} match={match} />;
  else if (inGame && match.phase === 'finished') content = <SummaryScreen match={match} />;
  else content = <HomeScreen />;

  return (
    <>
      {content}
      {inGame && <TimerOverlay />}
      {inGame && <BigAlert />}
      <Toasts />
    </>
  );
}
