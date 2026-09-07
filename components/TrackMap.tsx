'use client';

/**
 * The circuit, as an SVG plan view, with cars on it.
 *
 * Two dimensions deliberately: the 3D scene is WP7 and is a supporting element
 * rather than the headline (context.md §1). What this needs to do now is
 * answer the Glance question — where is my driver, and who is near them — in
 * about two seconds on a propped-up tablet.
 *
 * SVG rather than canvas because the shape is a few hundred points redrawn at
 * most sixty times a second, the browser is extremely good at that, and it
 * keeps every mark inspectable and themeable through the token set.
 */

import { useMemo } from 'react';
import type { Circuit, Driver, DriverCode } from '@/lib/types';
import type { CarState } from '@/lib/window';
import styles from './dashboard.module.css';

interface Props {
  circuit: Circuit;
  cars: CarState[];
  drivers: Driver[];
  selected: DriverCode | null;
  onSelect: (driver: DriverCode) => void;
}

const PAD = 40;

export function TrackMap({ circuit, cars, drivers, selected, onSelect }: Props) {
  // The projection depends only on the circuit, so it is computed once rather
  // than on every clock tick.
  const view = useMemo(() => {
    const { x, y } = circuit.line;
    const minX = Math.min(...x), maxX = Math.max(...x);
    const minY = Math.min(...y), maxY = Math.max(...y);
    // The frame comes from the geometry's own aspect ratio. Forcing a circuit
    // into a fixed box stretches it — Spa is 1.6:1 and the August build
    // squashed it into a square before this was written down.
    return {
      minX, minY,
      width: maxX - minX,
      height: maxY - minY,
      viewBox: `${minX - PAD} ${minY - PAD} ${maxX - minX + PAD * 2} ${maxY - minY + PAD * 2}`,
    };
  }, [circuit]);

  const path = useMemo(() => {
    const { x, y } = circuit.line;
    return x.map((vx, i) => `${i === 0 ? 'M' : 'L'}${vx.toFixed(1)},${y[i].toFixed(1)}`).join('');
  }, [circuit]);

  const colourOf = useMemo(() => {
    const m = new Map(drivers.map((d) => [d.code, d.teamColour]));
    return (code: DriverCode) => m.get(code) ?? 'currentColor';
  }, [drivers]);

  // Scale marks with the circuit so they read the same on any track.
  const unit = Math.max(view.width, view.height) / 100;

  return (
    <svg
      className={styles.map}
      viewBox={view.viewBox}
      // The SVG is decorative structure; the cars beneath carry the meaning
      // and are individually labelled.
      role="group"
      aria-label={`${circuit.name} with ${cars.length} cars`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* The road. Two strokes: a wide neutral casing and a thinner surface,
          so the circuit reads as a road rather than as a line on a chart. */}
      <path d={path} className={styles.roadCasing} strokeWidth={unit * 3.4} />
      <path d={path} className={styles.roadSurface} strokeWidth={unit * 2.2} />

      {/* Start line */}
      {circuit.line.x.length > 0 && (
        <circle
          cx={circuit.line.x[0]}
          cy={circuit.line.y[0]}
          r={unit * 1.6}
          className={styles.startLine}
        />
      )}

      {/* Corner markers. Named corners only — an unnamed number adds clutter
          without adding a landmark. */}
      {circuit.corners.filter((c) => c.name).map((c) => (
        <g key={`${c.number}${c.letter ?? ''}`}>
          <circle cx={c.x} cy={c.y} r={unit * 0.7} className={styles.cornerDot} />
        </g>
      ))}

      {/* Cars. Selected car last so it draws on top of the pack. */}
      {[...cars]
        .sort((a) => (a.driver === selected ? 1 : -1))
        .map((car) => {
          const isSelected = car.driver === selected;
          return (
            <g
              key={car.driver}
              className={styles.car}
              onClick={() => onSelect(car.driver)}
              role="button"
              tabIndex={0}
              aria-label={`${car.driver}, ${Math.round(car.speed)} kilometres per hour`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(car.driver);
                }
              }}
            >
              {/* An invisible generous hit area. The target is far larger than
                  the mark — the primary device is a fingertip, and a 4 px dot
                  is not a touch target. */}
              <circle cx={car.x} cy={car.y} r={unit * 5} fill="transparent" />
              {isSelected && (
                <circle cx={car.x} cy={car.y} r={unit * 4} className={styles.carHalo} />
              )}
              <circle
                cx={car.x}
                cy={car.y}
                r={unit * (isSelected ? 2.4 : 1.8)}
                fill={colourOf(car.driver)}
                className={styles.carDot}
                strokeWidth={unit * 0.5}
              />
            </g>
          );
        })}
    </svg>
  );
}
