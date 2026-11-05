import { Icon } from './Icon';
import styles from './PreviewPanel.module.css';

export function EmptyArtwork() {
  return (
    <div className={styles.artwork} aria-hidden="true">
      <div className={styles.backCard}>
        <span />
        <span />
      </div>
      <div className={styles.frontCard}>
        <svg viewBox="0 0 224 146">
          <defs>
            <linearGradient id="sky" x2="0" y2="1">
              <stop stopColor="#eee3d7" />
              <stop offset="1" stopColor="#f1d3bd" />
            </linearGradient>
          </defs>
          <rect width="224" height="146" fill="url(#sky)" />
          <circle cx="162" cy="42" r="18" fill="#edc08e" />
          <path d="M0 100 65 38 142 112 190 74 224 103V146H0Z" fill="#a4b8af" />
          <path d="M0 123Q70 79 118 115T224 110V146H0Z" fill="#698b7c" />
        </svg>
        <div>
          <span />
          <span />
        </div>
      </div>
      <span className={styles.artworkPlus}>
        <Icon name="plus" size={22} />
      </span>
      <span className={styles.artworkDot} />
    </div>
  );
}
