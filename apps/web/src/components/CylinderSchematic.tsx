import { useId } from "react";

interface CylinderSchematicProps {
  angleDeg: number;
  temperatureK: number;
  hydrogenMg: number;
  liquidWaterMg: number;
  vaporWaterMg: number;
  reducedMotion: boolean;
  passed: boolean;
}

export function CylinderSchematic({
  angleDeg,
  temperatureK,
  hydrogenMg,
  liquidWaterMg,
  vaporWaterMg,
  reducedMotion,
  passed,
}: CylinderSchematicProps) {
  const zoneGlowId = useId();
  const normalized = (1 - Math.cos((angleDeg * Math.PI) / 180)) / 2;
  const pistonY = 316 + normalized * 92;
  const displayY = reducedMotion ? Math.round(pistonY / 23) * 23 : pistonY;
  const normalizedTemperature = Math.max(
    0,
    Math.min(1, (temperatureK - 280) / 1_900),
  );
  const hue = 198 - normalizedTemperature * 165;

  return (
    <figure className="cylinder-figure">
      <svg
        viewBox="0 0 520 600"
        role="img"
        aria-label={`Single-zone cylinder schematic at ${angleDeg.toFixed(0)} crank-angle degrees; zone temperature ${temperatureK.toFixed(0)} kelvin.`}
      >
        <defs>
          <filter id={zoneGlowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="cylinder-metal">
          <path d="M115 132 L148 104 H372 L405 132 V468 Q405 500 375 514 H145 Q115 500 115 468 Z" />
          <path d="M143 150 L170 128 H350 L377 150 V448 H143 Z" />
          <path d="M165 112 Q176 60 216 54 H304 Q344 60 355 112" />
          <path d="M178 101 L144 61 L160 51 L205 92" />
          <path d="M342 101 L376 61 L360 51 L315 92" />
          <line x1="235" x2="235" y1="46" y2="116" />
          <line x1="285" x2="285" y1="46" y2="116" />
          <path d="M250 44 H270 V114 H250 Z" />
          <circle cx="260" cy="119" r="8" />
        </g>

        <path
          className="zone-fill"
          d={`M171 151 H349 V${displayY - 15} H171 Z`}
          fill={`hsl(${hue} 83% 48%)`}
          filter={passed ? `url(#${zoneGlowId})` : undefined}
        />
        <g className="water-layer">
          <path
            d={`M171 ${displayY - 50} C210 ${displayY - 63}, 249 ${displayY - 39}, 287 ${displayY - 53} C315 ${displayY - 62}, 335 ${displayY - 46}, 349 ${displayY - 51} V${displayY - 15} H171 Z`}
          />
          <circle cx="212" cy={displayY - 74} r="4" />
          <circle cx="293" cy={displayY - 89} r="3" />
          <circle cx="323" cy={displayY - 70} r="5" />
        </g>
        <g
          className="piston"
          style={{ transform: `translateY(${displayY - 316}px)` }}
        >
          <path d="M158 302 H362 V372 Q350 398 327 405 H193 Q170 398 158 372 Z" />
          <line x1="165" x2="355" y1="326" y2="326" />
          <line x1="165" x2="355" y1="342" y2="342" />
          <circle cx="260" cy="357" r="14" />
        </g>
        <g
          className="crank"
          style={{ transform: `translateY(${Math.min(90, displayY - 316)}px)` }}
        >
          <line x1="260" x2="260" y1="405" y2="474" />
          <circle cx="260" cy="487" r="35" />
          <circle cx="260" cy="487" r="18" />
        </g>

        <g className="cylinder-copy">
          <text x="260" y="206" textAnchor="middle">
            Single-zone state
          </text>
          <text x="260" y="230" textAnchor="middle">
            schematic, not CFD
          </text>
          <text className="readout" x="260" y="263" textAnchor="middle">
            Uniform P, T, Y
          </text>
          <text className="readout" x="260" y="286" textAnchor="middle">
            {temperatureK.toFixed(0)} K
          </text>
          <text className="water-label" x="190" y={displayY - 28}>
            liquid + vapor water
          </text>
        </g>
        <g className="inventory-copy">
          <circle cx="384" cy="258" r="5" />
          <text x="397" y="255">
            H₂ inventory
          </text>
          <text x="397" y="274">
            {hydrogenMg.toPrecision(3)} mg/cycle
          </text>
          <text x="397" y="310">
            H₂O(l) {liquidWaterMg.toFixed(0)} mg
          </text>
          <text x="397" y="330">
            H₂O(g) {vaporWaterMg.toFixed(0)} mg
          </text>
        </g>
      </svg>
      <figcaption>Single-zone state — schematic, not CFD.</figcaption>
    </figure>
  );
}
