import type { CSSProperties, ReactNode } from 'react';
import './GameCard.css';

interface GameCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  accent?: string;
  meta?: ReactNode;
  children?: ReactNode;
  disabled?: boolean;
}

/** Big selectable card used for game modes and multiplayer actions. */
export default function GameCard({ icon, title, description, accent = '#22d3ee', meta, children, disabled }: GameCardProps) {
  return (
    <article className={`game-card ${disabled ? 'disabled' : ''}`} style={{ '--card-accent': accent } as CSSProperties}>
      <div className="game-card-icon">{icon}</div>
      <h3 className="game-card-title">{title}</h3>
      <p className="game-card-desc">{description}</p>
      {meta && <div className="game-card-meta">{meta}</div>}
      {children && <div className="game-card-actions">{children}</div>}
    </article>
  );
}
