import styles from './page.module.css';

/* Foundations page.
   Two jobs: prove the build-and-deploy chain end to end, and render the design
   tokens so they can be looked at and reacted to. When the Figma values land in
   styles/tokens.css, this page shows them immediately — that is the feedback
   loop for WP3. It is not the product. */

const NEUTRAL_STEPS = [
  '0', '50', '100', '200', '300', '400',
  '500', '600', '700', '800', '900', '950',
];

const SEMANTIC = [
  { token: '--bg-surface', name: 'bg-surface', use: 'Panels, cards' },
  { token: '--bg-sunken', name: 'bg-sunken', use: 'Recessed areas' },
  { token: '--fg-primary', name: 'fg-primary', use: 'Body and headings' },
  { token: '--fg-secondary', name: 'fg-secondary', use: 'Supporting text' },
  { token: '--fg-muted', name: 'fg-muted', use: 'Labels, metadata' },
  { token: '--accent', name: 'accent', use: 'Brand, interactive' },
  { token: '--line-strong', name: 'line-strong', use: 'Structural rules' },
  { token: '--line-subtle', name: 'line-subtle', use: 'Within a group' },
];

const CATEGORICAL = ['1', '2', '3', '4', '5', '6', '7', '8'];
const SEQUENTIAL = ['0', '1', '2', '3', '4', '5'];

const TYPE_SCALE = [
  { token: '--text-3xl', label: '3xl · 36px', note: 'Page title' },
  { token: '--text-2xl', label: '2xl · 28px', note: 'Section' },
  { token: '--text-xl', label: 'xl · 22px', note: 'Subsection' },
  { token: '--text-lg', label: 'lg · 18px', note: 'Standfirst' },
  { token: '--text-base', label: 'base · 16px', note: 'Body — the floor' },
  { token: '--text-sm', label: 'sm · 15px', note: 'Secondary only' },
  { token: '--text-xs', label: 'xs · 13px', note: 'Labels only' },
];

const SPACE_SCALE = [
  ['--space-1', '4px'], ['--space-2', '8px'], ['--space-3', '12px'],
  ['--space-4', '16px'], ['--space-5', '24px'], ['--space-6', '32px'],
  ['--space-7', '48px'], ['--space-8', '64px'],
];

const STATUS = [
  { k: 'Product', v: 'A free race dashboard that plays a Grand Prix as it happened.' },
  { k: 'Data', v: 'Completed races, replayed in real time. Live data comes later.' },
  { k: 'Reveal', v: 'While a race plays you see only what has happened. The flag unlocks everything.' },
  { k: 'Devices', v: 'Tablet first, then laptop, then phone. No hover anywhere.' },
  { k: 'Hosting', v: 'Static files on GitHub Pages. No server until live arrives.' },
  { k: 'Built', v: 'Nothing yet. This page is the scaffold and the token set.' },
];

export default function FoundationsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Working title · not the final name</p>
        <h1 className={styles.title}>Race Replay</h1>
        <p className={styles.standfirst}>
          A free dashboard that plays a Grand Prix as it happened. This page is
          the first build — it exists to prove the deploy works and to show the
          design tokens on a real screen.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Where the project is</h2>
        <ul className={styles.statusList}>
          {STATUS.map(({ k, v }) => (
            <li key={k} className={styles.statusItem}>
              <span className={styles.statusKey}>{k}</span>
              <span className={styles.statusValue}>{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Colour</h2>

        <div className={styles.note}>
          <p>
            <strong>These values are placeholders.</strong> The structure follows
            Chris&rsquo;s <em>F1 Data Viz Design System</em> — a neutral 0–950
            ramp, a racing-red brand, eight categorical hues and a perceptually
            uniform sequential ramp — but the numbers are not yet his. Send the
            Figma file and they get replaced here, once, and every screen updates.
          </p>
        </div>

        <h3 className={styles.eyebrow} style={{ marginTop: 'var(--space-5)' }}>
          Neutral ramp
        </h3>
        <div className={styles.ramp}>
          {NEUTRAL_STEPS.map((step) => (
            <div
              key={step}
              className={styles.rampStep}
              style={{ background: `var(--neutral-${step})` }}
              title={`--neutral-${step}`}
            />
          ))}
        </div>

        <h3 className={styles.eyebrow} style={{ marginTop: 'var(--space-5)' }}>
          Semantic tokens — what components actually reference
        </h3>
        <div className={styles.swatchGrid}>
          {SEMANTIC.map(({ token, name, use }) => (
            <div key={token} className={styles.swatch}>
              <div
                className={styles.swatchChip}
                style={{ background: `var(${token})` }}
              />
              <div className={styles.swatchLabel}>
                <div className={styles.swatchName}>{name}</div>
                <div className={styles.swatchMeta}>{use}</div>
              </div>
            </div>
          ))}
        </div>

        <h3 className={styles.eyebrow} style={{ marginTop: 'var(--space-5)' }}>
          Categorical — identity, never magnitude
        </h3>
        <div className={styles.ramp}>
          {CATEGORICAL.map((n) => (
            <div
              key={n}
              className={styles.rampStep}
              style={{ background: `var(--cat-${n})` }}
              title={`--cat-${n}`}
            />
          ))}
        </div>
        <p className={styles.prose} style={{ marginTop: 'var(--space-3)' }}>
          Eight hues with no ordering, because a driver is not more or less than
          another driver. Used where colour answers <em>which</em>.
        </p>

        <h3 className={styles.eyebrow} style={{ marginTop: 'var(--space-5)' }}>
          Sequential — magnitude, never identity
        </h3>
        <div className={styles.ramp}>
          {SEQUENTIAL.map((n) => (
            <div
              key={n}
              className={styles.rampStep}
              style={{ background: `var(--seq-${n})` }}
              title={`--seq-${n}`}
            />
          ))}
        </div>
        <p className={styles.prose} style={{ marginTop: 'var(--space-3)' }}>
          Perceptually uniform, so equal steps in the data look like equal steps
          on screen. Used where colour answers <em>how much</em>. Only one
          saturated encoding is ever on screen at a time.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Provenance</h2>
        <p className={styles.prose} style={{ marginBottom: 'var(--space-4)' }}>
          Every figure declares where it came from, at the point of use rather
          than in a footnote. Three tiers exist even though only two are built —
          the third is reserved so adding it later is not a rewrite.
        </p>
        <div className={styles.provenanceRow}>
          <span className={styles.provenance}>
            <span
              className={styles.provenanceDot}
              style={{ background: 'var(--provenance-measured)' }}
            />
            Measured — straight from the feed
          </span>
          <span className={styles.provenance}>
            <span
              className={styles.provenanceDot}
              style={{ background: 'var(--provenance-modelled)' }}
            />
            Modelled — deterministic, states its assumptions
          </span>
          <span className={styles.provenance}>
            <span
              className={styles.provenanceDot}
              style={{ background: 'var(--provenance-generated)' }}
            />
            Generated — reserved, nothing built
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Type</h2>
        {TYPE_SCALE.map(({ token, label, note }) => (
          <div key={token} className={styles.typeRow}>
            <span className={styles.typeMeta}>
              {label}
              <br />
              {note}
            </span>
            <span className={styles.typeSample} style={{ fontSize: `var(${token})` }}>
              Russell leads at the flag
            </span>
          </div>
        ))}
        <div className={styles.typeRow}>
          <span className={styles.typeMeta}>
            mono · tabular
            <br />
            Telemetry numerals
          </span>
          <span className={`${styles.typeSample} mono`}>1:44.701 &nbsp; +0.526 &nbsp; 312 km/h</span>
        </div>
        <p className={styles.prose} style={{ marginTop: 'var(--space-4)' }}>
          Body text never goes below 16px. Numbers that change use the mono
          stack with tabular figures, so digits keep their column instead of the
          whole row shifting under the eye as it updates.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Space and targets</h2>
        {SPACE_SCALE.map(([token, px]) => (
          <div key={token} className={styles.spaceRow}>
            <span className={styles.typeMeta}>{token.replace('--', '')} · {px}</span>
            <span className={styles.spaceBar} style={{ width: `var(${token})` }} />
          </div>
        ))}
        <p className={styles.prose} style={{ margin: 'var(--space-5) 0 var(--space-3)' }}>
          Every interactive element clears 44px in both directions — on laptop
          too. A pointer can hit a large target; a finger cannot hit a small one,
          and the primary device has no pointer at all.
        </p>
        <button type="button" className={styles.target}>
          44px minimum
        </button>
      </section>

      <footer className={styles.footer}>
        <p>
          Scope, decisions and open questions live in <code>context.md</code>.
          This page will be replaced by the dashboard; it is scaffolding, and it
          says so rather than pretending to be a product.
        </p>
      </footer>
    </main>
  );
}
