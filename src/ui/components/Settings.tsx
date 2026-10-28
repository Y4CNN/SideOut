import { useApp } from '../../store/useApp';
import { Button, Sheet, Toggle } from './ui';

export function Settings({ onClose }: { onClose: () => void }) {
  const prefs = useApp(s => s.prefs);
  const setPrefs = useApp(s => s.setPrefs);
  return <Sheet title="Réglages" onClose={onClose}>
    <Toggle label="Mode sombre" checked={prefs.theme === 'dark'} onChange={v => setPrefs({theme: v ? 'dark' : 'light'})} />
    <Toggle label="Haute visibilité" hint="Contraste renforcé pour les gymnases très éclairés" checked={prefs.highVisibility} onChange={v => setPrefs({highVisibility:v})} />
    <Toggle label="Sons" hint="Alertes et fin de chrono" checked={prefs.sound} onChange={v => setPrefs({sound:v})} />
    <Toggle label="Vibrations" hint="Sur les appareils Android compatibles" checked={prefs.haptics} onChange={v => setPrefs({haptics:v})} />
    <Button className="mt-4 w-full" onClick={() => {setPrefs({onboardingDone:false}); onClose();}}>Revoir la présentation</Button>
    <p className="mt-4 text-sm text-muted">Pour arbitrer, tournez votre téléphone en paysage. La préparation reste disponible en portrait. Vos données restent sur cet appareil.</p>
  </Sheet>;
}
