import { useState } from 'react';
import { useApp } from '../../store/useApp';
import { Artwork } from './Artwork';
import { Button } from './ui';

const slides = [
  { image: 'onboarding-score', title: 'Le match, au bout des pouces.', text: 'Un toucher sur le score ajoute un point. Chaque équipe a ses commandes de son côté. Vous pouvez annuler la dernière action.' },
  { image: 'onboarding-rotation', title: 'Gardez les positions en vue.', text: 'Préparez les six positions, puis suivez le serveur, les rotations, les remplacements et les libéros.' },
  { image: 'onboarding-timeout', title: 'Le bon rythme, sans distraction.', text: 'Lancez un temps mort en un toucher. Le chrono vous avertit à la fin. Après le premier chargement, tout fonctionne hors connexion.' },
] as const;
export function Onboarding() {
  const [step, setStep] = useState(0);
  const done = () => useApp.getState().setPrefs({ onboardingDone: true });
  const slide = slides[step];
  return <main className="onboarding scroll-area px-safe pt-safe pb-safe">
    <div className="onboarding-top"><span className="eyebrow">ARBITRE VOLLEY · BIENVENUE</span><Button variant="ghost" onClick={done}>Passer</Button></div>
    <div className="onboarding-content">
      <Artwork key={slide.image} name={slide.image} eager className="illustration-halo onboarding-art" />
      <div className="onboarding-copy">
        <p className="eyebrow" role="status">Découverte · {step + 1} / 3</p>
        <h1 tabIndex={-1} className="mt-3 text-3xl font-extrabold tracking-tight">{slide.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">{slide.text}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {step > 0 && <Button onClick={() => setStep(step-1)}>Précédent</Button>}
          <Button variant="red" className="flex-1" onClick={() => step === 2 ? done() : setStep(step+1)}>{step === 2 ? 'C’est parti' : 'Suivant'}</Button>
        </div>
      </div>
    </div>
  </main>;
}
