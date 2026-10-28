import assets from '../../../public/images/manifest.json';

type ArtworkName = keyof typeof assets;
export function Artwork({ name, alt = '', className = '', eager = false, sizes = '(orientation: landscape) 40vw, 80vw' }: {
  name: ArtworkName; alt?: string; className?: string; eager?: boolean; sizes?: string;
}) {
  const info = assets[name];
  const path = `${import.meta.env.BASE_URL}images/${name}`;
  return <picture className={`artwork ${className}`}>
    <source type="image/avif" srcSet={info.widths.map(w => `${path}-${w}.avif ${w}w`).join(', ')} sizes={sizes} />
    <source type="image/webp" srcSet={info.widths.map(w => `${path}-${w}.webp ${w}w`).join(', ')} sizes={sizes} />
    <img src={`${path}.png`} width={info.width} height={info.height} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" />
  </picture>;
}
