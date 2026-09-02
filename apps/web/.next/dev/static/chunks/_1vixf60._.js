(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/src/components/wave-mark.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WaveMark",
    ()=>WaveMark
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.2.11+d8250c1691f7ae7c/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function WaveMark({ className = "" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: className,
        viewBox: "0 0 64 50",
        "aria-hidden": "true",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M5 24c9-14 18-17 29-6 8 8 14 7 24-3",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "5",
                strokeLinecap: "round"
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/wave-mark.tsx",
                lineNumber: 4,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M5 36c9-11 18-12 28-4 9 7 16 6 25-3",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "5",
                strokeLinecap: "round",
                opacity: ".72"
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/wave-mark.tsx",
                lineNumber: 11,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/src/components/wave-mark.tsx",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
_c = WaveMark;
var _c;
__turbopack_context__.k.register(_c, "WaveMark");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/view-model/src/domain.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_INPUTS",
    ()=>DEFAULT_INPUTS
]);
const DEFAULT_INPUTS = {
    fixture: "literature",
    scenario: "upstream_vaporized_carrier",
    waterTemperatureC: 25,
    systemPressureBar: 1,
    hydrogenHeadspaceMoleFraction: 1,
    henryModelRelativeUncertainty: 0.15,
    measuredTotalMgL: null,
    carrierVolumeMlPerCycle: 0.5,
    bubbleDiameterNm: 180,
    bubbleCountPerMl: 1_000_000,
    bubbleModelRelativeUncertainty: 0.75,
    retentionFraction: 0.72,
    displacementL: 0.5,
    compressionRatio: 10,
    speedRpm: 1500,
    equivalenceRatio: 1,
    sparkTimingDeg: -10,
    recoveredHeatJ: 0,
    measuredTotalUncertaintyMgL: 0,
    measuredTotalSourceId: "",
    retentionStandardUncertainty: 0.15,
    recoveredHeatUncertaintyJ: 0,
    recoveredHeatSourceId: "",
    seed: 42_617,
    cycleSamples: 64
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/view-model/src/fixtures.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "demoRuns",
    ()=>demoRuns,
    "makeRetentionTrace",
    ()=>makeRetentionTrace,
    "makeSimulationFixture",
    ()=>makeSimulationFixture
]);
const WATER_VAPORIZATION_J_PER_G = 2_440;
const H2_LHV_J_PER_MG = 120;
const degrees = Array.from({
    length: 73
}, (_, index)=>-180 + index * 5);
function volumeAtAngle(angleDeg, displacementCm3 = 500, ratio = 10) {
    const clearance = displacementCm3 / (ratio - 1);
    const normalized = (1 - Math.cos(angleDeg * Math.PI / 180)) / 2;
    return clearance + displacementCm3 * normalized;
}
function motoredPressure(angleDeg, volumeCm3) {
    const bdc = volumeAtAngle(-180);
    const compression = angleDeg <= 0;
    const exponent = compression ? 1.34 : 1.28;
    return Math.max(0.95, (bdc / volumeCm3) ** exponent);
}
function makeCycle(reactive) {
    const volumeCm3 = degrees.map((angle)=>volumeAtAngle(angle));
    const pressureBar = degrees.map((angle, index)=>{
        const motored = motoredPressure(angle, volumeCm3[index] ?? 500);
        if (!reactive) return motored;
        const combustion = 36 * Math.exp(-(((angle - 12) / 24) ** 2));
        return motored + combustion;
    });
    const temperatureK = degrees.map((angle, index)=>{
        const motored = 298 * (pressureBar[index] ?? 1) ** 0.22;
        return reactive ? motored + 820 * Math.exp(-(((angle - 20) / 42) ** 2)) : motored;
    });
    const heatReleaseJDeg = degrees.map((angle)=>reactive ? 32 * Math.exp(-(((angle - 8) / 22) ** 2)) : 0);
    const wallHeatJDeg = degrees.map((angle)=>reactive ? -6 * Math.exp(-(((angle - 25) / 48) ** 2)) : -0.5);
    const vaporizationJDeg = degrees.map((angle)=>reactive ? -3.2 * Math.exp(-(((angle + 5) / 40) ** 2)) : 0);
    return {
        crankAngle: [
            ...degrees
        ],
        volumeCm3,
        pressureBar,
        temperatureK,
        heatReleaseJDeg,
        wallHeatJDeg,
        vaporizationJDeg,
        h2Mg: degrees.map(()=>reactive ? 18.5 : 0),
        o2Mg: degrees.map((angle)=>Math.max(0, 121 - (reactive ? 95 * Math.max(0, Math.min(1, (angle + 10) / 60)) : 0))),
        n2Mg: degrees.map(()=>401),
        h2oVaporMg: degrees.map((angle)=>reactive ? 166 * Math.max(0, Math.min(1, (angle + 10) / 60)) : 0),
        waterLiquidMg: degrees.map((angle)=>500 * Math.max(0, Math.min(1, (120 - angle) / 220))),
        waterVaporMg: degrees.map((angle)=>500 * (1 - Math.max(0, Math.min(1, (120 - angle) / 220)))),
        pressureLower95Bar: null,
        pressureUpper95Bar: null,
        temperatureLower95K: null,
        temperatureUpper95K: null,
        acceptedUncertaintySamples: null,
        energyConservationResidualFraction: reactive ? 0.0031 : 0,
        indicatedWorkJ: reactive ? 628 : 0,
        imepBar: reactive ? 12.6 : 0,
        upperBoundEfficiency: reactive ? 0.34 : 0,
        adiabaticTemperatureK: reactive ? 2_180 : 780,
        thermalNoxRisk: reactive ? "moderate" : "low"
    };
}
const evidence = [
    {
        id: "nist-henry-298",
        basis: "literature",
        title: "NIST Henry-law reference at 298.15 K",
        detail: "0.00078 mol H₂ per kg water per bar; about 1.57 mg H₂/L at 1 bar.",
        uncertainty: "moderate",
        applicability: "Dissolved-gas reference only. It is not a measurement of this sample."
    },
    {
        id: "retention-assumption",
        basis: "user_assumption",
        title: "First-order retention estimate",
        detail: "72% retained at the intake in this default comparison.",
        uncertainty: "high",
        applicability: "Replace with a measured decay series before treating retention as evidence."
    },
    {
        id: "geometry-synthetic",
        basis: "user_assumption",
        title: "Synthetic 0.5 L single-cylinder geometry",
        detail: "10:1 compression ratio and 1,500 rpm nominal operating point.",
        uncertainty: "moderate",
        applicability: "Demonstration geometry; no physical engine is asserted."
    }
];
function hashFor(fixture, seed) {
    return `demo-${fixture}-${seed.toString(16).padStart(8, "0")}`;
}
function makeSimulationFixture(fixture, inputs) {
    const literatureTotal = 1.57;
    const initialTotalMgL = fixture === "artificial-pass" ? inputs.measuredTotalMgL ?? 62_000 : fixture === "water-injection" ? 1.9 : inputs.measuredTotalMgL ?? literatureTotal;
    const retainedMgL = initialTotalMgL * inputs.retentionFraction;
    const availableMg = retainedMgL * (inputs.carrierVolumeMlPerCycle / 1_000);
    const requiredMg = fixture === "water-injection" ? 0 : 17.1;
    const suppliedSeparateH2Mg = fixture === "water-injection" ? 18.5 : 0;
    const totalAvailableMg = availableMg + suppliedSeparateH2Mg;
    const waterG = inputs.carrierVolumeMlPerCycle;
    const hydrogenChemicalJ = totalAvailableMg * H2_LHV_J_PER_MG;
    const vaporizationJ = inputs.scenario === "upstream_vaporized_carrier" ? waterG * WATER_VAPORIZATION_J_PER_G : waterG * 0.2 * WATER_VAPORIZATION_J_PER_G;
    const sensibleHeatingJ = waterG * 4.18 * 75;
    const targetIndicatedWorkJ = 520;
    const energyMarginJ = hydrogenChemicalJ + inputs.recoveredHeatJ - vaporizationJ - sensibleHeatingJ - targetIndicatedWorkJ;
    const passed = totalAvailableMg >= requiredMg && energyMarginJ >= 0;
    const failures = [
        ...totalAvailableMg < requiredMg ? [
            "insufficient_h2"
        ] : [],
        ...energyMarginJ < 0 ? [
            "preheat_deficit"
        ] : []
    ];
    return {
        id: null,
        fixture,
        label: fixture === "artificial-pass" ? "Artificial pass fixture — synthetic only" : fixture === "water-injection" ? "Separate H₂ fuel + water injection comparison" : "Ambient dissolved-H₂ literature preset",
        scenario: fixture === "water-injection" ? "hydrogen_fuel_with_water_injection" : inputs.scenario,
        measuredTotalMgL: inputs.measuredTotalMgL,
        sampleVolumeMlPerCycle: inputs.carrierVolumeMlPerCycle,
        loading: {
            mode: inputs.measuredTotalMgL === null ? "derived" : "measured_total",
            dissolvedMgL: inputs.measuredTotalMgL === null ? literatureTotal : 0,
            bubbleContainedMgL: inputs.measuredTotalMgL === null ? 0.03 : 0,
            initialTotalMgL,
            retainedMgL,
            releasedMgL: initialTotalMgL - retainedMgL,
            unaccountedMgL: 0,
            retentionFraction: inputs.retentionFraction,
            intervalMgL: {
                low: initialTotalMgL * 0.78,
                high: initialTotalMgL * 1.22
            }
        },
        gate: {
            passed,
            failures,
            hydrogenAvailableMg: totalAvailableMg,
            hydrogenRequiredMg: requiredMg,
            hydrogenMarginMg: totalAvailableMg - requiredMg,
            energyMarginJ,
            energyTerms: {
                hydrogenChemicalJ,
                sensibleHeatingJ,
                vaporizationJ,
                recoveredHeatJ: inputs.recoveredHeatJ,
                wallLossJ: passed ? 170 : 0,
                targetIndicatedWorkJ
            },
            massBalanceResidualMg: 0,
            domainWarnings: []
        },
        motoredBaseline: makeCycle(false),
        proposedCycle: passed ? makeCycle(true) : null,
        pressureInterval: {
            low: 0.92,
            high: 1.08
        },
        sensitivities: [
            {
                label: "Total H₂ loading",
                normalized: 1,
                direction: "positive"
            },
            {
                label: "Retention at intake",
                normalized: 0.73,
                direction: "positive"
            },
            {
                label: "Carrier volume",
                normalized: 0.61,
                direction: "negative"
            },
            {
                label: "Recovered heat",
                normalized: 0.44,
                direction: "positive"
            }
        ],
        evidence: evidence.map((item)=>({
                ...item
            })),
        diagnostics: [
            "Frontend fixture is deterministic and clearly synthetic.",
            "Run the local model service for authoritative Cantera-backed results."
        ],
        seed: inputs.seed,
        modelVersion: "frontend-fixture-v1",
        resultHash: hashFor(fixture, inputs.seed)
    };
}
const demoRuns = [
    {
        id: "synthetic-003",
        name: "Synthetic-003",
        status: "needs_review",
        synthetic: true,
        updatedAt: "2026-08-22T15:18:00Z",
        timestamp: "2026-08-22T15:18:00Z",
        totalH2MgL: 2.04,
        retainedH2MgL: 1.49,
        retentionFraction: 0.73,
        operator: "Demo operator",
        sampleId: "DEMO-SAMPLE-003",
        method: "Synthetic headspace-GC series",
        calibrationReference: "DEMO-CAL-003",
        provenance: {
            source: "bundled demo fixture",
            method: "Synthetic headspace-GC series",
            ui_origin: "HydroCycle demo data",
            import_sha256: null,
            source_test_run_id: null,
            is_demo_synthetic: true
        },
        calibrationReferences: [
            {
                id: "DEMO-CAL-003",
                instrument: "synthetic demo instrument",
                method: "Synthetic headspace-GC series",
                applies_to: [
                    "hydrogen_decay.csv"
                ]
            }
        ],
        comparisons: {
            items: []
        },
        testRunEvidence: [],
        temperatureC: 24.1,
        pressureKpa: 100.8,
        elapsedS: 1_800,
        bubbleDiameterNm: 210,
        numberPerMl: 860_000,
        reviewNotes: "Synthetic example: replicate measurement is intentionally absent.",
        releasedH2MgL: 0.48,
        unaccountedH2MgL: 0.07,
        standardUncertainty: {
            totalH2MgL: 0.08,
            retainedH2MgL: 0.07,
            retentionFraction: 0.04,
            temperatureC: 0.2,
            pressureKpa: 0.3,
            elapsedS: 1,
            bubbleDiameterNm: 15,
            numberPerMl: 60_000,
            releasedH2MgL: 0.05,
            unaccountedH2MgL: 0.03
        },
        hydrogenDecaySeries: Array.from({
            length: 11
        }, (_, index)=>({
                timeS: index * 180,
                totalH2MgL: 2.04 * Math.exp(-(index * 180) / 5_700),
                uncertaintyMgL: 0.08
            })),
        bubbleDistribution: null,
        pressureTrace: null,
        attachmentHashes: [],
        simulationIds: [],
        measurementDatasetCount: 0,
        persisted: false
    },
    {
        id: "synthetic-002",
        name: "Synthetic-002",
        status: "valid",
        synthetic: true,
        updatedAt: "2026-08-21T18:44:00Z",
        timestamp: "2026-08-21T18:44:00Z",
        totalH2MgL: 1.81,
        retainedH2MgL: 1.21,
        retentionFraction: 0.67,
        operator: "Demo operator",
        sampleId: "DEMO-SAMPLE-002",
        method: "Synthetic headspace-GC series",
        calibrationReference: "DEMO-CAL-002",
        provenance: {
            source: "bundled demo fixture",
            method: "Synthetic headspace-GC series",
            ui_origin: "HydroCycle demo data",
            import_sha256: null,
            source_test_run_id: null,
            is_demo_synthetic: true
        },
        calibrationReferences: [
            {
                id: "DEMO-CAL-002",
                instrument: "synthetic demo instrument",
                method: "Synthetic headspace-GC series",
                applies_to: [
                    "hydrogen_decay.csv"
                ]
            }
        ],
        comparisons: {
            items: []
        },
        testRunEvidence: [],
        temperatureC: 25.0,
        pressureKpa: 101.1,
        elapsedS: 1_500,
        bubbleDiameterNm: 170,
        numberPerMl: 720_000,
        reviewNotes: "Synthetic reviewed example.",
        releasedH2MgL: 0.55,
        unaccountedH2MgL: 0.05,
        standardUncertainty: {
            totalH2MgL: 0.07,
            retainedH2MgL: 0.06,
            retentionFraction: 0.04,
            temperatureC: 0.2,
            pressureKpa: 0.3,
            elapsedS: 1,
            bubbleDiameterNm: 12,
            numberPerMl: 50_000,
            releasedH2MgL: 0.05,
            unaccountedH2MgL: 0.03
        },
        hydrogenDecaySeries: Array.from({
            length: 9
        }, (_, index)=>({
                timeS: index * 187.5,
                totalH2MgL: 1.81 * Math.exp(-(index * 187.5) / 3_750),
                uncertaintyMgL: 0.07
            })),
        bubbleDistribution: null,
        pressureTrace: null,
        attachmentHashes: [],
        simulationIds: [],
        measurementDatasetCount: 0,
        persisted: false
    },
    {
        id: "synthetic-001",
        name: "Synthetic-001",
        status: "invalid",
        synthetic: true,
        updatedAt: "2026-08-20T13:02:00Z",
        timestamp: "2026-08-20T13:02:00Z",
        totalH2MgL: 1.62,
        retainedH2MgL: null,
        retentionFraction: null,
        operator: "Demo operator",
        sampleId: "DEMO-SAMPLE-001",
        method: null,
        calibrationReference: null,
        provenance: {
            source: "bundled demo fixture",
            method: null,
            ui_origin: "HydroCycle demo data",
            import_sha256: null,
            source_test_run_id: null,
            is_demo_synthetic: true
        },
        calibrationReferences: [],
        comparisons: {
            items: []
        },
        testRunEvidence: [],
        temperatureC: 25.3,
        pressureKpa: 101.0,
        elapsedS: null,
        bubbleDiameterNm: null,
        numberPerMl: null,
        reviewNotes: "Synthetic invalid example: missing calibration and retention series.",
        releasedH2MgL: null,
        unaccountedH2MgL: null,
        standardUncertainty: {
            totalH2MgL: 0.08,
            retainedH2MgL: null,
            retentionFraction: null,
            temperatureC: 0.2,
            pressureKpa: 0.3,
            elapsedS: null,
            bubbleDiameterNm: null,
            numberPerMl: null,
            releasedH2MgL: null,
            unaccountedH2MgL: null
        },
        hydrogenDecaySeries: null,
        bubbleDistribution: null,
        pressureTrace: null,
        attachmentHashes: [],
        simulationIds: [],
        measurementDatasetCount: 0,
        persisted: false
    }
];
function makeRetentionTrace(run) {
    const measured = (run.hydrogenDecaySeries ?? []).map((point)=>({
            x: point.timeS,
            value: point.totalH2MgL,
            low: Math.max(0, point.totalH2MgL - 1.96 * point.uncertaintyMgL),
            high: point.totalH2MgL + 1.96 * point.uncertaintyMgL
        }));
    if (run.totalH2MgL === null || run.retainedH2MgL === null || run.elapsedS === null || run.elapsedS <= 0 || run.totalH2MgL <= 0 || run.retainedH2MgL <= 0 || run.retainedH2MgL > run.totalH2MgL) {
        return {
            measured,
            modeled: []
        };
    }
    const initial = run.totalH2MgL;
    const retained = run.retainedH2MgL;
    const duration = run.elapsedS;
    const decay = -Math.log(retained / initial);
    const modeled = Array.from({
        length: 31
    }, (_, index)=>{
        const x = duration * index / 30;
        return {
            x,
            value: decay === 0 ? initial : initial * Math.exp(-x * decay / duration)
        };
    });
    return {
        measured,
        modeled
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/view-model/src/chart-series.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "retentionComparisonSeries",
    ()=>retentionComparisonSeries,
    "seriesFromArrays",
    ()=>seriesFromArrays,
    "simulationChartSeries",
    ()=>simulationChartSeries,
    "summarizeChartSeries",
    ()=>summarizeChartSeries
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/fixtures.ts [app-client] (ecmascript)");
;
function completeFiniteArray(values, length) {
    return values !== null && values !== undefined && values.length === length && values.every(Number.isFinite);
}
function seriesFromArrays(id, label, x, values, options = {}) {
    if (x.length < 2 || x.length !== values.length || !x.every(Number.isFinite) || !values.every(Number.isFinite)) {
        return null;
    }
    const low = options.low;
    const high = options.high;
    const hasInterval = completeFiniteArray(low, x.length) && completeFiniteArray(high, x.length);
    const points = x.map((pointX, index)=>{
        const point = {
            x: pointX,
            value: values[index]
        };
        if (hasInterval) {
            point.low = low[index];
            point.high = high[index];
        }
        return point;
    });
    return {
        id,
        label,
        points,
        ...options.dashed === true ? {
            dashed: true
        } : {}
    };
}
function summarizeChartSeries(series) {
    const collection = "points" in series ? [
        series
    ] : series;
    const points = collection.flatMap((item)=>item.points);
    if (points.length === 0) return null;
    const intervalValues = points.flatMap((point)=>[
            ...point.low === undefined ? [] : [
                point.low
            ],
            ...point.high === undefined ? [] : [
                point.high
            ]
        ]);
    return {
        pointCount: points.length,
        xMin: Math.min(...points.map((point)=>point.x)),
        xMax: Math.max(...points.map((point)=>point.x)),
        valueMin: Math.min(...points.map((point)=>point.value)),
        valueMax: Math.max(...points.map((point)=>point.value)),
        intervalMin: intervalValues.length === 0 ? null : Math.min(...intervalValues),
        intervalMax: intervalValues.length === 0 ? null : Math.max(...intervalValues)
    };
}
function present(value) {
    return value !== null;
}
function simulationChartSeries(simulation) {
    const baseline = simulation.motoredBaseline;
    const proposed = simulation.gate.passed && simulation.proposedCycle !== null ? simulation.proposedCycle : null;
    const selected = proposed ?? baseline;
    return {
        pressure: [
            seriesFromArrays("pressure-motored", "Motored baseline", baseline.crankAngle, baseline.pressureBar, {
                dashed: true,
                low: baseline.pressureLower95Bar,
                high: baseline.pressureUpper95Bar
            }),
            ...proposed === null ? [] : [
                seriesFromArrays("pressure-proposed", "Proposed 0D cycle", proposed.crankAngle, proposed.pressureBar, {
                    low: proposed.pressureLower95Bar,
                    high: proposed.pressureUpper95Bar
                })
            ]
        ].filter(present),
        temperature: [
            seriesFromArrays("temperature-motored", "Motored baseline", baseline.crankAngle, baseline.temperatureK, {
                dashed: true,
                low: baseline.temperatureLower95K,
                high: baseline.temperatureUpper95K
            }),
            ...proposed === null ? [] : [
                seriesFromArrays("temperature-proposed", "Proposed 0D cycle", proposed.crankAngle, proposed.temperatureK, {
                    low: proposed.temperatureLower95K,
                    high: proposed.temperatureUpper95K
                })
            ]
        ].filter(present),
        heat: [
            seriesFromArrays("heat-combustion", "Combustion heat", selected.crankAngle, selected.heatReleaseJDeg),
            seriesFromArrays("heat-wall", "Wall heat", selected.crankAngle, selected.wallHeatJDeg),
            seriesFromArrays("heat-phase-change", "Phase change", selected.crankAngle, selected.vaporizationJDeg)
        ].filter(present),
        pv: [
            seriesFromArrays(proposed === null ? "pv-motored" : "pv-proposed", proposed === null ? "Motored baseline" : "Proposed 0D cycle", selected.volumeCm3, selected.pressureBar, {
                dashed: proposed === null
            })
        ].filter(present),
        sensitivities: simulation.sensitivities.map((item, index)=>seriesFromArrays(`sensitivity-${index}`, item.label, [
                0,
                1
            ], [
                0,
                item.direction === "negative" ? -item.normalized : item.normalized
            ])).filter(present)
    };
}
function retentionComparisonSeries(run) {
    const trace = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeRetentionTrace"])(run);
    const hasMeasuredInterval = trace.measured.every((point)=>point.low !== undefined && point.high !== undefined);
    const measured = seriesFromArrays("retention-measured", "Measured retention", trace.measured.map((point)=>point.x), trace.measured.map((point)=>point.value), {
        low: hasMeasuredInterval ? trace.measured.map((point)=>point.low) : null,
        high: hasMeasuredInterval ? trace.measured.map((point)=>point.high) : null
    });
    const modeled = seriesFromArrays("retention-modeled", "First-order model", trace.modeled.map((point)=>point.x), trace.modeled.map((point)=>point.value), {
        dashed: true
    });
    if (measured === null || modeled === null) {
        return {
            measured,
            modeled,
            residual: null
        };
    }
    const residualPoints = measured.points.map((point)=>{
        const nearest = modeled.points.reduce((best, candidate)=>Math.abs(candidate.x - point.x) < Math.abs(best.x - point.x) ? candidate : best);
        return {
            x: point.x,
            value: point.value - nearest.value,
            ...point.low === undefined ? {} : {
                low: point.low - nearest.value
            },
            ...point.high === undefined ? {} : {
                high: point.high - nearest.value
            }
        };
    });
    return {
        measured,
        modeled,
        residual: {
            id: "retention-residual",
            label: "Retention residual",
            points: residualPoints
        }
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/view-model/src/simulation-request.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mayContributeMeasurementEvidence",
    ()=>mayContributeMeasurementEvidence,
    "simulationRequest",
    ()=>simulationRequest
]);
function mayContributeMeasurementEvidence(fixture, run) {
    return Boolean(fixture === "literature" && run?.persisted && !run.synthetic && (run.status === "valid" && (run.totalH2MgL !== null || run.hydrogenDecaySeries?.length || run.bubbleDistribution?.length) || run.status === "needs_review" && run.totalH2MgL === null && !run.hydrogenDecaySeries?.length && Boolean(run.bubbleDistribution?.length)));
}
function simulationRequest(inputs, sourceRun = null) {
    const quantity = (value, unit, basis = "user_assumption", uncertainty = value === null ? 0 : Math.abs(value) * 0.05, sourceId = null, distributionOverride)=>({
            value,
            unit,
            standard_uncertainty: uncertainty,
            distribution: value === null || uncertainty === 0 ? "fixed" : distributionOverride ?? "normal",
            source_id: sourceId,
            basis
        });
    const elapsedS = 3_600;
    const retainedFraction = Math.max(1e-9, Math.min(1, inputs.retentionFraction));
    const firstOrderRate = -Math.log(retainedFraction) / elapsedS;
    const waterInjectionScenario = inputs.scenario === "hydrogen_fuel_with_water_injection";
    const request = {
        schema_version: "1.0.0",
        scenario: waterInjectionScenario ? "hydrogen_with_water_injection" : "upstream_vaporized_carrier",
        sample: {
            water_volume_l: quantity(1, "L", "user_assumption", 0.01, "sample-water-volume-assumption"),
            carrier_volume_ml_per_cycle: quantity(inputs.carrierVolumeMlPerCycle, "mL/cycle", "user_assumption", Math.abs(inputs.carrierVolumeMlPerCycle) * 0.05, "carrier-delivery-volume-assumption"),
            measured_total_h2_mg_l: quantity(inputs.measuredTotalMgL, "mg/L", inputs.fixture === "artificial-pass" ? "synthetic" : inputs.measuredTotalMgL !== null && inputs.measuredTotalSourceId ? "measured" : "user_assumption", inputs.measuredTotalUncertaintyMgL, inputs.measuredTotalSourceId || (inputs.measuredTotalMgL === null ? null : "user-entered-total-h2-unreviewed")),
            separate_h2_mg_per_cycle: quantity(waterInjectionScenario ? 18.5 : 0, "mg/cycle", "synthetic", waterInjectionScenario ? 0.5 : 0, "synthetic-separate-h2-comparison"),
            water_injection_mg_per_cycle: quantity(waterInjectionScenario ? inputs.carrierVolumeMlPerCycle * 1_000 : 0, "mg/cycle", "synthetic", waterInjectionScenario ? Math.abs(inputs.carrierVolumeMlPerCycle * 1_000) * 0.05 : 0, "synthetic-water-injection-comparison")
        },
        environment: {
            water_temperature_k: quantity(inputs.waterTemperatureC + 273.15, "K", "user_assumption", 0.25, "sample-temperature"),
            water_pressure_bar: quantity(inputs.systemPressureBar, "bar", "user_assumption", 0.01, "sample-pressure"),
            hydrogen_headspace_mole_fraction: quantity(inputs.hydrogenHeadspaceMoleFraction, "1", "user_assumption", 0, "pure-h2-headspace-assumption"),
            henry_loading_scale: quantity(1, "1", "user_assumption", inputs.henryModelRelativeUncertainty, "henry-reference-and-temperature-model-uncertainty"),
            intake_temperature_k: quantity(300, "K", "user_assumption", 1, "intake-temperature-assumption"),
            intake_pressure_bar: quantity(1, "bar", "user_assumption", 0.01, "intake-pressure-assumption")
        },
        bubble_population: {
            bins: [
                {
                    diameter_nm: quantity(inputs.bubbleDiameterNm, "nm", "user_assumption", inputs.bubbleDiameterNm * 0.2, "bubble-sizing-diagnostic", "lognormal"),
                    number_per_ml: quantity(inputs.bubbleCountPerMl, "1/mL", "user_assumption", inputs.bubbleCountPerMl * 0.5, "bubble-sizing-diagnostic", "lognormal")
                }
            ],
            surface_tension_n_m: quantity(0.07197, "N/m", "literature", 0.002, "water-surface-tension-298K"),
            hydrogen_content_scale: quantity(1, "1", "user_assumption", inputs.bubbleModelRelativeUncertainty, "bubble-gas-identity-and-content-uncertainty", "lognormal"),
            method: "bubble-sizing diagnostic only; gas identity requires orthogonal confirmation"
        },
        retention: {
            measured_time_series: [],
            elapsed_time_s: quantity(elapsedS, "s", "user_assumption", 5, "elapsed-time-assumption"),
            first_order_rate_constant_per_s: quantity(firstOrderRate, "1/s", "user_assumption", firstOrderRate * (inputs.retentionStandardUncertainty / Math.max(1e-9, inputs.retentionFraction)), "retention-visible-assumption"),
            handling_loss_fraction: quantity(0, "1", "user_assumption", 0, "no-handling-loss-assumption"),
            intake_delivery_fraction: quantity(1, "1", "user_assumption", 0, "complete-intake-delivery-assumption"),
            reported_released_fraction: quantity(null, "1", "user_assumption", 0, "unmeasured-release-fraction"),
            release_method: "passive transfer to intake; visible user assumption"
        },
        engine: {
            displacement_l: quantity(inputs.displacementL, "L", "synthetic", 0.001, "synthetic-engine-displacement"),
            compression_ratio: quantity(inputs.compressionRatio, "1", "synthetic", 0.05, "synthetic-engine-compression-ratio"),
            speed_rpm: quantity(inputs.speedRpm, "rpm", "synthetic", 10, "synthetic-engine-speed")
        },
        combustion: {
            target_equivalence_ratio: quantity(inputs.equivalenceRatio, "1", "synthetic", 0.03, "synthetic-equivalence-ratio"),
            combustion_start_deg_atdc: quantity(inputs.sparkTimingDeg, "deg", "user_assumption", 2, "combustion-start-assumption")
        },
        heat_recovery: {
            recovered_heat_j_per_cycle: quantity(inputs.recoveredHeatJ, "J/cycle", inputs.fixture === "artificial-pass" ? "synthetic" : inputs.recoveredHeatJ > 0 && inputs.recoveredHeatSourceId ? "measured" : "user_assumption", inputs.recoveredHeatUncertaintyJ, inputs.recoveredHeatSourceId || (inputs.recoveredHeatJ > 0 ? "user-entered-heat-recovery-unreviewed" : "no-measured-heat-recovery"))
        },
        uncertainty: {
            enabled: true,
            analytical_samples: 200,
            cycle_samples: inputs.cycleSamples,
            seed: inputs.seed
        }
    };
    if (!sourceRun) return request;
    const decaySeries = sourceRun.hydrogenDecaySeries ?? [];
    const firstDecayPoint = decaySeries[0];
    const finalDecayPoint = decaySeries[decaySeries.length - 1];
    const measuredTotal = sourceRun.totalH2MgL ?? firstDecayPoint?.totalH2MgL ?? null;
    const measuredTotalUncertainty = sourceRun.standardUncertainty.totalH2MgL ?? firstDecayPoint?.uncertaintyMgL ?? 0;
    const sourceId = sourceRun.calibrationReference ?? sourceRun.provenance.import_sha256 ?? `test-run:${sourceRun.id}`;
    if (sourceRun.status === "needs_review") {
        const diagnosticBins = sourceRun.bubbleDistribution ?? [];
        request.bubble_population = {
            ...request.bubble_population,
            bins: diagnosticBins.map((point)=>({
                    diameter_nm: quantity(point.diameterNm, "nm", "user_assumption", point.diameterNm * 0.2, `${sourceId}:bubble-bin-uncertainty-assumption`, "lognormal"),
                    number_per_ml: quantity(point.numberPerMl, "1/mL", "user_assumption", point.numberPerMl * 0.5, `${sourceId}:bubble-bin-uncertainty-assumption`, "lognormal")
                })),
            method: `${sourceRun.method ?? "selected Test Run bubble-distribution import"}; unvalidated bin values treated as explicit 20% diameter and 50% count uncertainty assumptions; diagnostic only, not measured evidence or total-H₂ authority`
        };
        return request;
    }
    const firstPointIsAuthoritativeTotal = firstDecayPoint !== undefined && measuredTotal === firstDecayPoint.totalH2MgL && measuredTotalUncertainty === firstDecayPoint.uncertaintyMgL;
    const measuredTotalSourceId = firstPointIsAuthoritativeTotal ? `${sourceId}:decay:0` : `${sourceId}:total-h2`;
    request.sample = {
        ...request.sample,
        measured_total_h2_mg_l: quantity(measuredTotal, "mg/L", "measured", measuredTotalUncertainty, measuredTotalSourceId)
    };
    const measuredElapsed = sourceRun.elapsedS ?? finalDecayPoint?.timeS ?? elapsedS;
    const measuredElapsedUncertainty = sourceRun.elapsedS === null ? 0 : sourceRun.standardUncertainty.elapsedS ?? 0;
    const releasedFraction = sourceRun.releasedH2MgL !== null && measuredTotal !== null && measuredTotal > 0 ? sourceRun.releasedH2MgL / measuredTotal : null;
    const releasedFractionUncertainty = releasedFraction === null || sourceRun.releasedH2MgL === null || measuredTotal === null || measuredTotal <= 0 ? 0 : Math.sqrt(((sourceRun.standardUncertainty.releasedH2MgL ?? 0) / measuredTotal) ** 2 + (sourceRun.releasedH2MgL * measuredTotalUncertainty / measuredTotal ** 2) ** 2);
    if (decaySeries.length > 0 || sourceRun.elapsedS !== null || releasedFraction !== null) {
        request.retention = {
            ...request.retention,
            ...decaySeries.length > 0 ? {
                measured_time_series: decaySeries.map((point, index)=>({
                        time_s: point.timeS,
                        total_h2_mg_l: quantity(point.totalH2MgL, "mg/L", "measured", point.uncertaintyMgL, `${sourceId}:decay:${index}`)
                    }))
            } : {},
            ...sourceRun.elapsedS !== null || finalDecayPoint ? {
                elapsed_time_s: quantity(measuredElapsed, "s", "measured", measuredElapsedUncertainty, sourceId)
            } : {},
            ...releasedFraction !== null ? {
                reported_released_fraction: quantity(releasedFraction, "1", "measured", releasedFractionUncertainty, sourceId)
            } : {},
            release_method: decaySeries.length > 0 ? "selected local Test Run measurement overlay; measured decay and mass ledger take precedence" : "selected local Test Run mass-ledger overlay; first-order retention remains an explicit assumption"
        };
    }
    if (sourceRun.temperatureC !== null) {
        request.environment = {
            ...request.environment,
            water_temperature_k: quantity(sourceRun.temperatureC + 273.15, "K", "measured", sourceRun.standardUncertainty.temperatureC ?? 0, sourceId)
        };
    }
    if (sourceRun.pressureKpa !== null) {
        request.environment = {
            ...request.environment,
            water_pressure_bar: quantity(sourceRun.pressureKpa / 100, "bar", "measured", (sourceRun.standardUncertainty.pressureKpa ?? 0) / 100, sourceId)
        };
    }
    if (sourceRun.bubbleDistribution?.length) {
        request.bubble_population = {
            ...request.bubble_population,
            bins: sourceRun.bubbleDistribution.map((point)=>({
                    diameter_nm: quantity(point.diameterNm, "nm", "user_assumption", point.diameterNm * 0.2, `${sourceId}:bubble-bin-uncertainty-assumption`, "lognormal"),
                    number_per_ml: quantity(point.numberPerMl, "1/mL", "user_assumption", point.numberPerMl * 0.5, `${sourceId}:bubble-bin-uncertainty-assumption`, "lognormal")
                })),
            method: `${sourceRun.method ?? "selected Test Run bubble-distribution import"}; measured bin values with explicit 20% diameter and 50% count uncertainty assumptions; diagnostic only, not total-H₂ authority`
        };
    } else if (sourceRun.bubbleDiameterNm !== null && sourceRun.numberPerMl !== null) {
        request.bubble_population = {
            ...request.bubble_population,
            bins: [
                {
                    diameter_nm: quantity(sourceRun.bubbleDiameterNm, "nm", "measured", sourceRun.standardUncertainty.bubbleDiameterNm ?? 0, sourceId),
                    number_per_ml: quantity(sourceRun.numberPerMl, "1/mL", "measured", sourceRun.standardUncertainty.numberPerMl ?? 0, sourceId)
                }
            ],
            method: `${sourceRun.method ?? "selected Test Run bubble sizing"}; diagnostic only, not total-H₂ authority`
        };
    }
    return request;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/view-model/src/simulation-adapter.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mapApiSimulationResult",
    ()=>mapApiSimulationResult,
    "proposedCycleForDisplay",
    ()=>proposedCycleForDisplay
]);
function heatRate(cumulative, angle) {
    return cumulative.map((value, index)=>{
        if (index === 0) return 0;
        const previousValue = cumulative[index - 1] ?? value;
        const deltaAngle = (angle[index] ?? 0) - (angle[index - 1] ?? 0);
        return deltaAngle === 0 ? 0 : (value - previousValue) / deltaAngle;
    });
}
function mapCycleTrace(trace) {
    return {
        crankAngle: trace.crank_angle_deg,
        volumeCm3: trace.volume_m3.map((value)=>value * 1e6),
        pressureBar: trace.pressure_pa.map((value)=>value / 1e5),
        temperatureK: trace.temperature_k,
        heatReleaseJDeg: heatRate(trace.cumulative_heat_release_j, trace.crank_angle_deg),
        wallHeatJDeg: heatRate(trace.cumulative_wall_heat_loss_j, trace.crank_angle_deg).map((value)=>-Math.abs(value)),
        vaporizationJDeg: heatRate(trace.cumulative_vaporization_heat_j, trace.crank_angle_deg).map((value)=>-Math.abs(value)),
        h2Mg: trace.h2_mg,
        o2Mg: trace.o2_mg,
        n2Mg: trace.n2_mg,
        h2oVaporMg: trace.h2o_vapor_mg,
        waterLiquidMg: trace.water_liquid_mg,
        waterVaporMg: trace.water_vapor_mg,
        pressureLower95Bar: trace.uncertainty?.pressure_lower_95_pa.map((value)=>value / 1e5) ?? null,
        pressureUpper95Bar: trace.uncertainty?.pressure_upper_95_pa.map((value)=>value / 1e5) ?? null,
        temperatureLower95K: trace.uncertainty?.temperature_lower_95_k ?? null,
        temperatureUpper95K: trace.uncertainty?.temperature_upper_95_k ?? null,
        acceptedUncertaintySamples: trace.uncertainty?.accepted_cycle_samples ?? null,
        energyConservationResidualFraction: trace.energy_conservation_residual_fraction,
        indicatedWorkJ: trace.pv_work_j,
        imepBar: trace.imep_bar,
        upperBoundEfficiency: trace.upper_bound_indicated_efficiency,
        adiabaticTemperatureK: trace.adiabatic_flame_temperature_k,
        thermalNoxRisk: trace.relative_thermal_nox_risk
    };
}
function humanizeParameter(parameter) {
    return parameter.replace(/^.*\./, "").replaceAll("_", " ").replace(/\bh2\b/i, "H₂").replace(/^./, (letter)=>letter.toUpperCase());
}
function proposedCycleForDisplay(result) {
    return result.gate.passed === true ? result.proposed_cycle : null;
}
function mapApiSimulationResult(fallback, raw) {
    const total = raw.loading.total_h2_mg_l.value;
    const totalUncertainty = raw.loading.total_h2_mg_l.standard_uncertainty;
    const carrierVolumeMl = raw.input.sample?.carrier_volume_ml_per_cycle?.value ?? null;
    const motoredBaseline = mapCycleTrace(raw.motored_baseline);
    const proposedCycle = proposedCycleForDisplay(raw);
    return {
        ...fallback,
        id: raw.result_id,
        scenario: raw.input.scenario === "hydrogen_with_water_injection" ? "hydrogen_fuel_with_water_injection" : "upstream_vaporized_carrier",
        measuredTotalMgL: raw.input.sample?.measured_total_h2_mg_l?.value ?? null,
        sampleVolumeMlPerCycle: carrierVolumeMl,
        loading: {
            mode: raw.loading.mode,
            dissolvedMgL: raw.loading.dissolved_h2_mg_l.value,
            bubbleContainedMgL: raw.loading.bubble_contained_h2_mg_l.value,
            initialTotalMgL: raw.retention.initial_total_h2_mg_l.value,
            retainedMgL: raw.retention.retained_at_intake_mg_l.value,
            releasedMgL: raw.retention.released_h2_mg_l.value,
            unaccountedMgL: raw.retention.unaccounted_h2_mg_l.value,
            retentionFraction: raw.retention.retained_fraction.value,
            intervalMgL: total === null ? null : {
                low: Math.max(0, total - 1.96 * totalUncertainty),
                high: total + 1.96 * totalUncertainty
            }
        },
        gate: {
            passed: raw.gate.passed,
            failures: raw.gate.failures.filter((failure)=>failure !== "pass"),
            hydrogenRequiredMg: raw.gate.hydrogen_required.value,
            hydrogenAvailableMg: raw.gate.hydrogen_available.value,
            hydrogenMarginMg: raw.gate.hydrogen_mass_margin_mg_per_cycle,
            energyMarginJ: raw.gate.energy_terms.usable_energy_margin_j,
            energyTerms: {
                hydrogenChemicalJ: raw.gate.energy_terms.hydrogen_chemical_energy_j,
                sensibleHeatingJ: raw.gate.energy_terms.water_sensible_heating_j,
                vaporizationJ: raw.gate.energy_terms.water_phase_change_j,
                recoveredHeatJ: raw.gate.energy_terms.heat_recovery_j,
                wallLossJ: raw.gate.energy_terms.estimated_wall_loss_j,
                targetIndicatedWorkJ: raw.gate.energy_terms.target_indicated_work_j
            },
            massBalanceResidualMg: raw.gate.mass_balance.residual_h2_mg_per_cycle,
            domainWarnings: raw.gate.domain_warnings ?? []
        },
        motoredBaseline,
        proposedCycle: proposedCycle ? mapCycleTrace(proposedCycle) : null,
        sensitivities: raw.uncertainty.sensitivities.filter((entry)=>entry.direction !== "neutral" && Math.abs(entry.normalized_effect) > 1e-6).slice(0, 8).map((entry)=>({
                label: humanizeParameter(entry.parameter),
                normalized: Math.abs(entry.normalized_effect),
                direction: entry.direction === "increases" ? "positive" : "negative"
            })),
        evidence: raw.evidence.map((record)=>({
                id: record.id,
                basis: record.basis,
                title: record.title,
                detail: `${record.method}; ${record.value_or_range} ${record.unit}`,
                uncertainty: /high|wide|unknown/i.test(record.uncertainty) ? "high" : /moderate/i.test(record.uncertainty) ? "moderate" : "low",
                applicability: record.applicability_note
            })),
        diagnostics: [
            ...raw.diagnostics.map((diagnostic)=>diagnostic.message),
            "Result evaluated by the local HydroCycle model API."
        ],
        seed: raw.reproducibility.random_seed,
        modelVersion: raw.reproducibility.model_version,
        resultHash: raw.result_id
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/view-model/src/test-run-adapter.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "hasRecordedMeasurements",
    ()=>hasRecordedMeasurements,
    "mapApiTestRun",
    ()=>mapApiTestRun,
    "measurementDatasetCount",
    ()=>measurementDatasetCount,
    "testRunPatchPayload",
    ()=>testRunPatchPayload,
    "testRunPayload",
    ()=>testRunPayload
]);
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finiteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function recordString(value) {
    return typeof value === "string" && value.trim() ? value : null;
}
function measuredScalar(value) {
    return isRecord(value) ? finiteNumber(value.value) : null;
}
function measuredStandardUncertainty(value) {
    return isRecord(value) ? finiteNumber(value.standard_uncertainty) : null;
}
const scalarMeasurementKeys = [
    "headspace_gc_mg_l",
    "total_h2_mg_l",
    "retained_h2_mg_l",
    "retention_fraction",
    "released_h2_mg_l",
    "unaccounted_h2_mg_l",
    "temperature_k",
    "pressure_pa_abs",
    "elapsed_s",
    "bubble_diameter_nm",
    "number_per_ml"
];
const seriesMeasurementKeys = [
    "hydrogen_decay.csv",
    "bubble_distribution.csv",
    "pressure_trace.csv"
];
function measurementDatasetCount(measurements) {
    const scalarCount = scalarMeasurementKeys.reduce((count, key)=>count + (measuredScalar(measurements[key]) === null ? 0 : 1), 0);
    const seriesCount = seriesMeasurementKeys.reduce((count, key)=>count + (Array.isArray(measurements[key]) && measurements[key].length > 0 ? 1 : 0), 0);
    return scalarCount + seriesCount;
}
function mapHydrogenSeries(value) {
    if (!Array.isArray(value)) return null;
    const points = value.flatMap((item)=>{
        if (!isRecord(item)) return [];
        const timeS = finiteNumber(item.time_s);
        const totalH2MgL = finiteNumber(item.total_h2_mg_L);
        const uncertaintyMgL = finiteNumber(item.uncertainty_mg_L);
        return timeS === null || totalH2MgL === null || uncertaintyMgL === null ? [] : [
            {
                timeS,
                totalH2MgL,
                uncertaintyMgL
            }
        ];
    });
    return points.length > 0 ? points : null;
}
function mapBubbleDistribution(value) {
    if (!Array.isArray(value)) return null;
    const points = value.flatMap((item)=>{
        if (!isRecord(item)) return [];
        const diameterNm = finiteNumber(item.diameter_nm);
        const numberPerMl = finiteNumber(item.number_per_mL);
        return diameterNm === null || numberPerMl === null ? [] : [
            {
                diameterNm,
                numberPerMl
            }
        ];
    });
    return points.length > 0 ? points : null;
}
function mapPressureSeries(value) {
    if (!Array.isArray(value)) return null;
    const points = value.flatMap((item)=>{
        if (!isRecord(item)) return [];
        const crankAngleDeg = finiteNumber(item.crank_angle_deg);
        const pressureBar = finiteNumber(item.pressure_bar);
        const uncertaintyBar = finiteNumber(item.uncertainty_bar);
        return crankAngleDeg === null || pressureBar === null || uncertaintyBar === null ? [] : [
            {
                crankAngleDeg,
                pressureBar,
                uncertaintyBar
            }
        ];
    });
    return points.length > 0 ? points : null;
}
function hasRecordedMeasurements(run) {
    return measurementDatasetCount(run.measurements) > 0;
}
function mapApiTestRun(document) {
    const measurements = document.measurements;
    const provenance = document.provenance;
    const totalH2MgL = measuredScalar(measurements.total_h2_mg_l);
    const retainedH2MgL = measuredScalar(measurements.retained_h2_mg_l);
    const temperatureK = measuredScalar(measurements.temperature_k);
    const pressurePa = measuredScalar(measurements.pressure_pa_abs);
    const pressureUncertaintyPa = measuredStandardUncertainty(measurements.pressure_pa_abs);
    const firstCalibration = document.calibration_references[0];
    const calibrationReference = isRecord(firstCalibration) ? recordString(firstCalibration.id) ?? recordString(firstCalibration.method) : null;
    return {
        id: document.id,
        name: document.name,
        status: document.status,
        synthetic: document.is_demo_synthetic,
        updatedAt: document.updated_at,
        timestamp: document.updated_at,
        totalH2MgL,
        retainedH2MgL,
        retentionFraction: measuredScalar(measurements.retention_fraction) ?? (totalH2MgL !== null && totalH2MgL !== 0 && retainedH2MgL !== null ? retainedH2MgL / totalH2MgL : null),
        operator: document.operator,
        sampleId: document.sample_id,
        method: recordString(provenance.method),
        calibrationReference,
        provenance,
        calibrationReferences: document.calibration_references,
        comparisons: document.comparisons,
        testRunEvidence: document.evidence.map((evidence)=>({
                kind: evidence.kind,
                title: evidence.title,
                author_or_publisher: evidence.author_or_publisher,
                publication_date: evidence.publication_date,
                ...evidence.url !== undefined ? {
                    url: evidence.url
                } : {},
                ...evidence.local_attachment !== undefined ? {
                    local_attachment: evidence.local_attachment
                } : {},
                method: evidence.method,
                value_or_range: evidence.value_or_range,
                unit: evidence.unit,
                uncertainty: evidence.uncertainty,
                applicability_note: evidence.applicability_note
            })),
        temperatureC: temperatureK === null ? null : temperatureK - 273.15,
        pressureKpa: pressurePa === null ? null : pressurePa / 1_000,
        elapsedS: measuredScalar(measurements.elapsed_s),
        bubbleDiameterNm: measuredScalar(measurements.bubble_diameter_nm),
        numberPerMl: measuredScalar(measurements.number_per_ml),
        reviewNotes: document.notes,
        releasedH2MgL: measuredScalar(measurements.released_h2_mg_l),
        unaccountedH2MgL: measuredScalar(measurements.unaccounted_h2_mg_l),
        standardUncertainty: {
            totalH2MgL: measuredStandardUncertainty(measurements.total_h2_mg_l),
            retainedH2MgL: measuredStandardUncertainty(measurements.retained_h2_mg_l),
            retentionFraction: measuredStandardUncertainty(measurements.retention_fraction),
            temperatureC: measuredStandardUncertainty(measurements.temperature_k),
            pressureKpa: pressureUncertaintyPa === null ? null : pressureUncertaintyPa / 1_000,
            elapsedS: measuredStandardUncertainty(measurements.elapsed_s),
            bubbleDiameterNm: measuredStandardUncertainty(measurements.bubble_diameter_nm),
            numberPerMl: measuredStandardUncertainty(measurements.number_per_ml),
            releasedH2MgL: measuredStandardUncertainty(measurements.released_h2_mg_l),
            unaccountedH2MgL: measuredStandardUncertainty(measurements.unaccounted_h2_mg_l)
        },
        hydrogenDecaySeries: mapHydrogenSeries(measurements["hydrogen_decay.csv"]),
        bubbleDistribution: mapBubbleDistribution(measurements["bubble_distribution.csv"]),
        pressureTrace: mapPressureSeries(measurements["pressure_trace.csv"]),
        attachmentHashes: document.attachments.map((attachment)=>attachment.sha256),
        simulationIds: document.simulation_ids,
        measurementDatasetCount: measurementDatasetCount(measurements),
        persisted: true,
        sourceMeasurements: measurements
    };
}
function testRunPayload(run) {
    const measurementSource = run.calibrationReference ?? "ui-unreviewed-operator-entry";
    const measuredValue = (value, standardUncertainty, unit, label, existing)=>{
        if (value === null) return null;
        if (standardUncertainty === null || standardUncertainty <= 0) {
            throw new Error(`${label} requires a positive standard uncertainty.`);
        }
        return {
            ...existing,
            value,
            unit,
            standard_uncertainty: standardUncertainty,
            distribution: existing?.distribution ?? "normal",
            source_id: existing?.source_id ?? measurementSource,
            basis: existing?.basis ?? "measured"
        };
    };
    const sourceMeasurements = run.sourceMeasurements ?? {};
    const selectedCalibration = run.calibrationReference ? run.calibrationReferences.find((reference)=>reference.id === run.calibrationReference) : null;
    const calibrationReferences = !run.calibrationReference ? run.calibrationReferences : selectedCalibration ? [
        selectedCalibration,
        ...run.calibrationReferences.filter((reference)=>reference.id !== selectedCalibration.id)
    ] : [
        {
            id: run.calibrationReference,
            instrument: "operator-specified local instrument",
            method: run.method ?? "unspecified measurement method",
            applies_to: [
                ...run.hydrogenDecaySeries ? [
                    "hydrogen_decay.csv"
                ] : [],
                ...run.bubbleDistribution ? [
                    "bubble_distribution.csv"
                ] : [],
                ...run.pressureTrace ? [
                    "pressure_trace.csv"
                ] : []
            ]
        },
        ...run.calibrationReferences
    ];
    return {
        name: run.name,
        status: run.status,
        operator: run.operator,
        sample_id: run.sampleId,
        notes: run.reviewNotes,
        is_demo_synthetic: run.synthetic,
        provenance: {
            ...run.provenance,
            method: run.method,
            ui_origin: run.provenance.ui_origin ?? "HydroCycle Test Runs",
            is_demo_synthetic: run.synthetic
        },
        measurements: {
            ...sourceMeasurements,
            total_h2_mg_l: measuredValue(run.totalH2MgL, run.standardUncertainty.totalH2MgL, "mg/L", "Total H₂", sourceMeasurements.total_h2_mg_l),
            retained_h2_mg_l: measuredValue(run.retainedH2MgL, run.standardUncertainty.retainedH2MgL, "mg/L", "Retained H₂", sourceMeasurements.retained_h2_mg_l),
            // Preserve an independently recorded fraction, but never materialize the
            // display-only fraction derived from the two measured masses.
            retention_fraction: sourceMeasurements.retention_fraction ?? null,
            released_h2_mg_l: measuredValue(run.releasedH2MgL, run.standardUncertainty.releasedH2MgL, "mg/L", "Released H₂", sourceMeasurements.released_h2_mg_l),
            unaccounted_h2_mg_l: measuredValue(run.unaccountedH2MgL, run.standardUncertainty.unaccountedH2MgL, "mg/L", "Unaccounted H₂", sourceMeasurements.unaccounted_h2_mg_l),
            temperature_k: measuredValue(run.temperatureC === null ? null : run.temperatureC + 273.15, run.standardUncertainty.temperatureC, "K", "Temperature", sourceMeasurements.temperature_k),
            pressure_pa_abs: measuredValue(run.pressureKpa === null ? null : run.pressureKpa * 1_000, run.standardUncertainty.pressureKpa === null ? null : run.standardUncertainty.pressureKpa * 1_000, "Pa", "Pressure", sourceMeasurements.pressure_pa_abs),
            elapsed_s: measuredValue(run.elapsedS, run.standardUncertainty.elapsedS, "s", "Elapsed time", sourceMeasurements.elapsed_s),
            bubble_diameter_nm: measuredValue(run.bubbleDiameterNm, run.standardUncertainty.bubbleDiameterNm, "nm", "Bubble diameter", sourceMeasurements.bubble_diameter_nm),
            number_per_ml: measuredValue(run.numberPerMl, run.standardUncertainty.numberPerMl, "1/mL", "Bubble number concentration", sourceMeasurements.number_per_ml),
            "hydrogen_decay.csv": run.hydrogenDecaySeries?.map((point)=>({
                    time_s: point.timeS,
                    total_h2_mg_L: point.totalH2MgL,
                    uncertainty_mg_L: point.uncertaintyMgL
                })) ?? null,
            "bubble_distribution.csv": run.bubbleDistribution?.map((point)=>({
                    diameter_nm: point.diameterNm,
                    number_per_mL: point.numberPerMl
                })) ?? null,
            "pressure_trace.csv": run.pressureTrace?.map((point)=>({
                    crank_angle_deg: point.crankAngleDeg,
                    pressure_bar: point.pressureBar,
                    uncertainty_bar: point.uncertaintyBar
                })) ?? null
        },
        calibration_references: calibrationReferences,
        comparisons: run.comparisons,
        evidence: run.testRunEvidence
    };
}
function testRunPatchPayload(run) {
    const payload = testRunPayload(run);
    return {
        expected_updated_at: run.updatedAt,
        name: run.name,
        status: run.status,
        operator: run.operator,
        sample_id: run.sampleId,
        notes: run.reviewNotes,
        is_demo_synthetic: run.synthetic,
        provenance: payload.provenance ?? run.provenance,
        measurements: payload.measurements ?? {},
        calibration_references: payload.calibration_references ?? []
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/view-model/src/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/domain.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$chart$2d$series$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/chart-series.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/fixtures.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$simulation$2d$request$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/simulation-request.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$simulation$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/simulation-adapter.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$test$2d$run$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/test-run-adapter.ts [app-client] (ecmascript)");
;
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/data/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/data/fixture.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FixtureHydroCycleDataSource",
    ()=>FixtureHydroCycleDataSource
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/view-model/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/domain.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/fixtures.ts [app-client] (ecmascript)");
;
class FixtureHydroCycleDataSource {
    mode = "hosted";
    capabilities = {
        persistence: "session",
        rawFileImport: false,
        export: true,
        mutation: true,
        simulation: true,
        advisory: "guided-fixture",
        disabledReason: "Raw file import requires the local validated model service."
    };
    runs = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["demoRuns"].map((run)=>({
            ...run
        }));
    fixture = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_INPUTS"].fixture;
    async health() {
        return {
            status: "ok",
            detail: "Deterministic public fixture"
        };
    }
    async modelMetadata() {
        return {
            solver: "fixture",
            python: null,
            cantera: null,
            mechanism: null,
            seed: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_INPUTS"].seed
        };
    }
    async simulate(input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeSimulationFixture"])(this.fixture, {
            ...input,
            fixture: this.fixture
        });
    }
    async listTestRuns() {
        return this.runs.map((run)=>({
                ...run
            }));
    }
    async getTestRun(id) {
        const run = this.runs.find((item)=>item.id === id);
        if (!run) throw new Error("Fixture Test Run was not found.");
        return {
            ...run
        };
    }
    async createTestRun(input) {
        const now = new Date().toISOString();
        const template = this.runs[0];
        if (!template) throw new Error("Fixture seed is unavailable.");
        const run = {
            ...template,
            id: `session-${crypto.randomUUID()}`,
            name: input.name,
            status: input.status,
            synthetic: true,
            persisted: false,
            operator: input.operator ?? null,
            sampleId: input.sample_id ?? null,
            reviewNotes: input.notes ?? null,
            updatedAt: now,
            timestamp: now
        };
        this.runs = [
            run,
            ...this.runs
        ];
        return {
            ...run
        };
    }
    async patchTestRun(id, input) {
        const existing = await this.getTestRun(id);
        if (existing.updatedAt !== input.expected_updated_at) {
            throw new Error("Session Test Run changed; refresh before saving the edit.");
        }
        const updated = {
            ...existing,
            name: input.name ?? existing.name,
            status: input.status ?? existing.status,
            operator: input.operator === undefined ? existing.operator : input.operator,
            sampleId: input.sample_id === undefined ? existing.sampleId : input.sample_id,
            reviewNotes: input.notes === undefined ? existing.reviewNotes : input.notes,
            updatedAt: new Date().toISOString()
        };
        this.runs = this.runs.map((run)=>run.id === id ? updated : run);
        return {
            ...updated
        };
    }
    async deleteTestRun(id, expectedUpdatedAt) {
        const existing = await this.getTestRun(id);
        if (existing.updatedAt !== expectedUpdatedAt) throw new Error("Session Test Run changed; refresh before deleting it.");
        this.runs = this.runs.filter((run)=>run.id !== id);
    }
    async exportTestRun(id, expectedUpdatedAt) {
        const existing = await this.getTestRun(id);
        if (existing.updatedAt !== expectedUpdatedAt) throw new Error("Session Test Run changed; refresh before exporting it.");
        return {
            blob: new Blob([
                JSON.stringify(existing, null, 2)
            ], {
                type: "application/json"
            }),
            filename: `hydrocycle-${id}-session.json`
        };
    }
    async importTestRun(_source, _options) {
        throw new Error(this.capabilities.disabledReason ?? "Import is unavailable.");
    }
    selectFixture(fixtureId) {
        if (fixtureId === "literature" || fixtureId === "artificial-pass" || fixtureId === "water-injection") {
            this.fixture = fixtureId;
        }
    }
    resetSession() {
        this.runs = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["demoRuns"].map((run)=>({
                ...run
            }));
        this.fixture = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_INPUTS"].fixture;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/contracts/src/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createHydroCycleClient",
    ()=>createHydroCycleClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$openapi$2d$fetch$40$0$2e$14$2e$1$2f$node_modules$2f$openapi$2d$fetch$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/openapi-fetch@0.14.1/node_modules/openapi-fetch/dist/index.mjs [app-client] (ecmascript)");
;
function createHydroCycleClient(baseUrl = "") {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$openapi$2d$fetch$40$0$2e$14$2e$1$2f$node_modules$2f$openapi$2d$fetch$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
        baseUrl
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/contracts/fixtures/simulation-input.default.json.[json].cjs [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "bubble_population": {
        "bins": [
            {
                "diameter_nm": {
                    "basis": "literature",
                    "distribution": "lognormal",
                    "source_id": "literature-comparison-bubble-size",
                    "standard_uncertainty": 40.0,
                    "unit": "nm",
                    "value": 200.0
                },
                "number_per_ml": {
                    "basis": "literature",
                    "distribution": "lognormal",
                    "source_id": "literature-comparison-number-density",
                    "standard_uncertainty": 50000000.0,
                    "unit": "1/mL",
                    "value": 100000000.0
                }
            }
        ],
        "hydrogen_content_scale": {
            "basis": "user_assumption",
            "distribution": "lognormal",
            "source_id": "bubble-gas-identity-and-content-uncertainty",
            "standard_uncertainty": 0.75,
            "unit": "1",
            "value": 1.0
        },
        "method": "particle-sizing diagnostic; gas identity requires orthogonal confirmation",
        "surface_tension_n_m": {
            "basis": "literature",
            "distribution": "normal",
            "source_id": "water-surface-tension-298K",
            "standard_uncertainty": 0.002,
            "unit": "N/m",
            "value": 0.07197
        }
    },
    "combustion": {
        "combustion_duration_deg": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wiebe-duration-assumption",
            "standard_uncertainty": 5.0,
            "unit": "deg",
            "value": 60.0
        },
        "combustion_efficiency": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "combustion-efficiency-assumption",
            "standard_uncertainty": 0.02,
            "unit": "1",
            "value": 0.95
        },
        "combustion_start_deg_atdc": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wiebe-start-assumption",
            "standard_uncertainty": 2.0,
            "unit": "deg",
            "value": -10.0
        },
        "gate_wall_loss_fraction": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wall-loss-wide-assumption",
            "standard_uncertainty": 0.05,
            "unit": "1",
            "value": 0.2
        },
        "motored_gamma": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "polytropic-gamma-assumption",
            "standard_uncertainty": 0.02,
            "unit": "1",
            "value": 1.35
        },
        "target_equivalence_ratio": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-equivalence-ratio",
            "standard_uncertainty": 0.03,
            "unit": "1",
            "value": 0.8
        },
        "wall_temperature_k": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wall-temperature-assumption",
            "standard_uncertainty": 20.0,
            "unit": "K",
            "value": 450.0
        },
        "wiebe_a": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "wiebe-shape-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 5.0
        },
        "wiebe_m": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "wiebe-shape-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 2.0
        }
    },
    "engine": {
        "bore_mm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-bore",
            "standard_uncertainty": 0.05,
            "unit": "mm",
            "value": 86.0
        },
        "compression_ratio": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-compression-ratio",
            "standard_uncertainty": 0.05,
            "unit": "1",
            "value": 10.5
        },
        "connecting_rod_mm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-rod",
            "standard_uncertainty": 0.1,
            "unit": "mm",
            "value": 143.0
        },
        "displacement_l": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-displacement",
            "standard_uncertainty": 0.001,
            "unit": "L",
            "value": 0.5
        },
        "speed_rpm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-speed",
            "standard_uncertainty": 10.0,
            "unit": "rpm",
            "value": 2000.0
        },
        "stroke_mm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-stroke",
            "standard_uncertainty": 0.05,
            "unit": "mm",
            "value": 86.0
        },
        "target_imep_bar": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-target-imep",
            "standard_uncertainty": 0.2,
            "unit": "bar",
            "value": 6.0
        },
        "volumetric_efficiency": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-ve",
            "standard_uncertainty": 0.03,
            "unit": "1",
            "value": 0.9
        }
    },
    "environment": {
        "henry_loading_scale": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "henry-reference-and-temperature-model-uncertainty",
            "standard_uncertainty": 0.15,
            "unit": "1",
            "value": 1.0
        },
        "hydrogen_headspace_mole_fraction": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "pure-h2-headspace-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 1.0
        },
        "intake_pressure_bar": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "intake-pressure",
            "standard_uncertainty": 0.01,
            "unit": "bar",
            "value": 1.0
        },
        "intake_temperature_k": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "intake-temperature",
            "standard_uncertainty": 1.0,
            "unit": "K",
            "value": 300.0
        },
        "water_pressure_bar": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "sample-pressure",
            "standard_uncertainty": 0.01,
            "unit": "bar",
            "value": 1.0
        },
        "water_temperature_k": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "sample-temperature",
            "standard_uncertainty": 0.25,
            "unit": "K",
            "value": 298.15
        }
    },
    "heat_recovery": {
        "recovered_heat_j_per_cycle": {
            "basis": "derived",
            "distribution": "fixed",
            "source_id": "no-measured-recovery",
            "standard_uncertainty": 0.0,
            "unit": "J/cycle",
            "value": 0.0
        }
    },
    "retention": {
        "elapsed_time_s": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "elapsed-time",
            "standard_uncertainty": 5.0,
            "unit": "s",
            "value": 3600.0
        },
        "first_order_rate_constant_per_s": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "retention-wide-assumption",
            "standard_uncertainty": 5e-6,
            "unit": "1/s",
            "value": 0.00001
        },
        "handling_loss_fraction": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "handling-loss-wide-assumption",
            "standard_uncertainty": 0.05,
            "unit": "1",
            "value": 0.1
        },
        "intake_delivery_fraction": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "complete-release-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 1.0
        },
        "measured_time_series": [],
        "release_method": "passive transfer to intake; user assumption",
        "reported_released_fraction": {
            "basis": "derived",
            "distribution": "fixed",
            "source_id": null,
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": null
        }
    },
    "sample": {
        "carrier_volume_ml_per_cycle": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "carrier-delivery",
            "standard_uncertainty": 0.05,
            "unit": "mL/cycle",
            "value": 1.0
        },
        "measured_total_h2_mg_l": {
            "basis": "derived",
            "distribution": "fixed",
            "source_id": null,
            "standard_uncertainty": 0.0,
            "unit": "mg/L",
            "value": null
        },
        "separate_h2_mg_per_cycle": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-separate-h2",
            "standard_uncertainty": 0.5,
            "unit": "mg/cycle",
            "value": 20.0
        },
        "water_injection_mg_per_cycle": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-water-injection",
            "standard_uncertainty": 1.0,
            "unit": "mg/cycle",
            "value": 20.0
        },
        "water_volume_l": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "sample-volume",
            "standard_uncertainty": 0.01,
            "unit": "L",
            "value": 1.0
        }
    },
    "scenario": "upstream_vaporized_carrier",
    "schema_version": "1.0.0",
    "uncertainty": {
        "analytical_samples": 200,
        "cycle_samples": 64,
        "enabled": true,
        "seed": 20260824
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/contracts/fixtures/simulation-input.measured-total.json.[json].cjs [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "bubble_population": null,
    "combustion": {
        "combustion_duration_deg": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wiebe-duration-assumption",
            "standard_uncertainty": 5.0,
            "unit": "deg",
            "value": 60.0
        },
        "combustion_efficiency": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "combustion-efficiency-assumption",
            "standard_uncertainty": 0.02,
            "unit": "1",
            "value": 0.95
        },
        "combustion_start_deg_atdc": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wiebe-start-assumption",
            "standard_uncertainty": 2.0,
            "unit": "deg",
            "value": -10.0
        },
        "gate_wall_loss_fraction": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wall-loss-wide-assumption",
            "standard_uncertainty": 0.05,
            "unit": "1",
            "value": 0.2
        },
        "motored_gamma": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "polytropic-gamma-assumption",
            "standard_uncertainty": 0.02,
            "unit": "1",
            "value": 1.35
        },
        "target_equivalence_ratio": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-equivalence-ratio",
            "standard_uncertainty": 0.03,
            "unit": "1",
            "value": 0.8
        },
        "wall_temperature_k": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wall-temperature-assumption",
            "standard_uncertainty": 20.0,
            "unit": "K",
            "value": 450.0
        },
        "wiebe_a": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "wiebe-shape-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 5.0
        },
        "wiebe_m": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "wiebe-shape-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 2.0
        }
    },
    "engine": {
        "bore_mm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-bore",
            "standard_uncertainty": 0.05,
            "unit": "mm",
            "value": 86.0
        },
        "compression_ratio": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-compression-ratio",
            "standard_uncertainty": 0.05,
            "unit": "1",
            "value": 10.5
        },
        "connecting_rod_mm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-rod",
            "standard_uncertainty": 0.1,
            "unit": "mm",
            "value": 143.0
        },
        "displacement_l": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-displacement",
            "standard_uncertainty": 0.001,
            "unit": "L",
            "value": 0.5
        },
        "speed_rpm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-speed",
            "standard_uncertainty": 10.0,
            "unit": "rpm",
            "value": 2000.0
        },
        "stroke_mm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-stroke",
            "standard_uncertainty": 0.05,
            "unit": "mm",
            "value": 86.0
        },
        "target_imep_bar": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-target-imep",
            "standard_uncertainty": 0.2,
            "unit": "bar",
            "value": 6.0
        },
        "volumetric_efficiency": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-ve",
            "standard_uncertainty": 0.03,
            "unit": "1",
            "value": 0.9
        }
    },
    "environment": {
        "henry_loading_scale": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "henry-reference-and-temperature-model-uncertainty",
            "standard_uncertainty": 0.15,
            "unit": "1",
            "value": 1.0
        },
        "hydrogen_headspace_mole_fraction": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "pure-h2-headspace-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 1.0
        },
        "intake_pressure_bar": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "intake-pressure",
            "standard_uncertainty": 0.01,
            "unit": "bar",
            "value": 1.0
        },
        "intake_temperature_k": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "intake-temperature",
            "standard_uncertainty": 1.0,
            "unit": "K",
            "value": 300.0
        },
        "water_pressure_bar": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "sample-pressure",
            "standard_uncertainty": 0.01,
            "unit": "bar",
            "value": 1.0
        },
        "water_temperature_k": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "sample-temperature",
            "standard_uncertainty": 0.25,
            "unit": "K",
            "value": 298.15
        }
    },
    "heat_recovery": {
        "recovered_heat_j_per_cycle": {
            "basis": "derived",
            "distribution": "fixed",
            "source_id": "no-measured-recovery",
            "standard_uncertainty": 0.0,
            "unit": "J/cycle",
            "value": 0.0
        }
    },
    "retention": {
        "elapsed_time_s": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "elapsed-time",
            "standard_uncertainty": 5.0,
            "unit": "s",
            "value": 3600.0
        },
        "first_order_rate_constant_per_s": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "retention-wide-assumption",
            "standard_uncertainty": 5e-6,
            "unit": "1/s",
            "value": 0.00001
        },
        "handling_loss_fraction": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "handling-loss-wide-assumption",
            "standard_uncertainty": 0.05,
            "unit": "1",
            "value": 0.1
        },
        "intake_delivery_fraction": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "complete-release-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 1.0
        },
        "measured_time_series": [],
        "release_method": "passive transfer to intake; user assumption",
        "reported_released_fraction": {
            "basis": "derived",
            "distribution": "fixed",
            "source_id": null,
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": null
        }
    },
    "sample": {
        "carrier_volume_ml_per_cycle": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "carrier-delivery",
            "standard_uncertainty": 0.05,
            "unit": "mL/cycle",
            "value": 1.0
        },
        "measured_total_h2_mg_l": {
            "basis": "measured",
            "distribution": "normal",
            "source_id": "example-headspace-gc-total-h2",
            "standard_uncertainty": 0.1,
            "unit": "mg/L",
            "value": 2.0
        },
        "separate_h2_mg_per_cycle": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-separate-h2",
            "standard_uncertainty": 0.5,
            "unit": "mg/cycle",
            "value": 20.0
        },
        "water_injection_mg_per_cycle": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-water-injection",
            "standard_uncertainty": 1.0,
            "unit": "mg/cycle",
            "value": 20.0
        },
        "water_volume_l": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "sample-volume",
            "standard_uncertainty": 0.01,
            "unit": "L",
            "value": 1.0
        }
    },
    "scenario": "upstream_vaporized_carrier",
    "schema_version": "1.0.0",
    "uncertainty": {
        "analytical_samples": 200,
        "cycle_samples": 64,
        "enabled": true,
        "seed": 20260824
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/contracts/fixtures/simulation-input.water-injection.json.[json].cjs [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "bubble_population": {
        "bins": [
            {
                "diameter_nm": {
                    "basis": "literature",
                    "distribution": "lognormal",
                    "source_id": "literature-comparison-bubble-size",
                    "standard_uncertainty": 40.0,
                    "unit": "nm",
                    "value": 200.0
                },
                "number_per_ml": {
                    "basis": "literature",
                    "distribution": "lognormal",
                    "source_id": "literature-comparison-number-density",
                    "standard_uncertainty": 50000000.0,
                    "unit": "1/mL",
                    "value": 100000000.0
                }
            }
        ],
        "hydrogen_content_scale": {
            "basis": "user_assumption",
            "distribution": "lognormal",
            "source_id": "bubble-gas-identity-and-content-uncertainty",
            "standard_uncertainty": 0.75,
            "unit": "1",
            "value": 1.0
        },
        "method": "particle-sizing diagnostic; gas identity requires orthogonal confirmation",
        "surface_tension_n_m": {
            "basis": "literature",
            "distribution": "normal",
            "source_id": "water-surface-tension-298K",
            "standard_uncertainty": 0.002,
            "unit": "N/m",
            "value": 0.07197
        }
    },
    "combustion": {
        "combustion_duration_deg": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wiebe-duration-assumption",
            "standard_uncertainty": 5.0,
            "unit": "deg",
            "value": 60.0
        },
        "combustion_efficiency": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "combustion-efficiency-assumption",
            "standard_uncertainty": 0.02,
            "unit": "1",
            "value": 0.95
        },
        "combustion_start_deg_atdc": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wiebe-start-assumption",
            "standard_uncertainty": 2.0,
            "unit": "deg",
            "value": -10.0
        },
        "gate_wall_loss_fraction": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wall-loss-wide-assumption",
            "standard_uncertainty": 0.05,
            "unit": "1",
            "value": 0.2
        },
        "motored_gamma": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "polytropic-gamma-assumption",
            "standard_uncertainty": 0.02,
            "unit": "1",
            "value": 1.35
        },
        "target_equivalence_ratio": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-equivalence-ratio",
            "standard_uncertainty": 0.03,
            "unit": "1",
            "value": 0.8
        },
        "wall_temperature_k": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "wall-temperature-assumption",
            "standard_uncertainty": 20.0,
            "unit": "K",
            "value": 450.0
        },
        "wiebe_a": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "wiebe-shape-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 5.0
        },
        "wiebe_m": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "wiebe-shape-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 2.0
        }
    },
    "engine": {
        "bore_mm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-bore",
            "standard_uncertainty": 0.05,
            "unit": "mm",
            "value": 86.0
        },
        "compression_ratio": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-compression-ratio",
            "standard_uncertainty": 0.05,
            "unit": "1",
            "value": 10.5
        },
        "connecting_rod_mm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-rod",
            "standard_uncertainty": 0.1,
            "unit": "mm",
            "value": 143.0
        },
        "displacement_l": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-displacement",
            "standard_uncertainty": 0.001,
            "unit": "L",
            "value": 0.5
        },
        "speed_rpm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-speed",
            "standard_uncertainty": 10.0,
            "unit": "rpm",
            "value": 2000.0
        },
        "stroke_mm": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-stroke",
            "standard_uncertainty": 0.05,
            "unit": "mm",
            "value": 86.0
        },
        "target_imep_bar": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-target-imep",
            "standard_uncertainty": 0.2,
            "unit": "bar",
            "value": 6.0
        },
        "volumetric_efficiency": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-engine-ve",
            "standard_uncertainty": 0.03,
            "unit": "1",
            "value": 0.9
        }
    },
    "environment": {
        "henry_loading_scale": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "henry-reference-and-temperature-model-uncertainty",
            "standard_uncertainty": 0.15,
            "unit": "1",
            "value": 1.0
        },
        "hydrogen_headspace_mole_fraction": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "pure-h2-headspace-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 1.0
        },
        "intake_pressure_bar": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "intake-pressure",
            "standard_uncertainty": 0.01,
            "unit": "bar",
            "value": 1.0
        },
        "intake_temperature_k": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "intake-temperature",
            "standard_uncertainty": 1.0,
            "unit": "K",
            "value": 300.0
        },
        "water_pressure_bar": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "sample-pressure",
            "standard_uncertainty": 0.01,
            "unit": "bar",
            "value": 1.0
        },
        "water_temperature_k": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "sample-temperature",
            "standard_uncertainty": 0.25,
            "unit": "K",
            "value": 298.15
        }
    },
    "heat_recovery": {
        "recovered_heat_j_per_cycle": {
            "basis": "derived",
            "distribution": "fixed",
            "source_id": "no-measured-recovery",
            "standard_uncertainty": 0.0,
            "unit": "J/cycle",
            "value": 0.0
        }
    },
    "retention": {
        "elapsed_time_s": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "elapsed-time",
            "standard_uncertainty": 5.0,
            "unit": "s",
            "value": 3600.0
        },
        "first_order_rate_constant_per_s": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "retention-wide-assumption",
            "standard_uncertainty": 5e-6,
            "unit": "1/s",
            "value": 0.00001
        },
        "handling_loss_fraction": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "handling-loss-wide-assumption",
            "standard_uncertainty": 0.05,
            "unit": "1",
            "value": 0.1
        },
        "intake_delivery_fraction": {
            "basis": "user_assumption",
            "distribution": "fixed",
            "source_id": "complete-release-assumption",
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": 1.0
        },
        "measured_time_series": [],
        "release_method": "passive transfer to intake; user assumption",
        "reported_released_fraction": {
            "basis": "derived",
            "distribution": "fixed",
            "source_id": null,
            "standard_uncertainty": 0.0,
            "unit": "1",
            "value": null
        }
    },
    "sample": {
        "carrier_volume_ml_per_cycle": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "carrier-delivery",
            "standard_uncertainty": 0.05,
            "unit": "mL/cycle",
            "value": 1.0
        },
        "measured_total_h2_mg_l": {
            "basis": "derived",
            "distribution": "fixed",
            "source_id": null,
            "standard_uncertainty": 0.0,
            "unit": "mg/L",
            "value": null
        },
        "separate_h2_mg_per_cycle": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-separate-h2",
            "standard_uncertainty": 0.5,
            "unit": "mg/cycle",
            "value": 20.0
        },
        "water_injection_mg_per_cycle": {
            "basis": "synthetic",
            "distribution": "normal",
            "source_id": "synthetic-water-injection",
            "standard_uncertainty": 1.0,
            "unit": "mg/cycle",
            "value": 20.0
        },
        "water_volume_l": {
            "basis": "user_assumption",
            "distribution": "normal",
            "source_id": "sample-volume",
            "standard_uncertainty": 0.01,
            "unit": "L",
            "value": 1.0
        }
    },
    "scenario": "hydrogen_with_water_injection",
    "schema_version": "1.0.0",
    "uncertainty": {
        "analytical_samples": 200,
        "cycle_samples": 64,
        "enabled": true,
        "seed": 20260824
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/contracts/src/fixtures.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "defaultSimulationInput",
    ()=>defaultSimulationInput,
    "measuredTotalSimulationInput",
    ()=>measuredTotalSimulationInput,
    "waterInjectionSimulationInput",
    ()=>waterInjectionSimulationInput
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$fixtures$2f$simulation$2d$input$2e$default$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/contracts/fixtures/simulation-input.default.json.[json].cjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$fixtures$2f$simulation$2d$input$2e$measured$2d$total$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/contracts/fixtures/simulation-input.measured-total.json.[json].cjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$fixtures$2f$simulation$2d$input$2e$water$2d$injection$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/contracts/fixtures/simulation-input.water-injection.json.[json].cjs [app-client] (ecmascript)");
;
;
;
const defaultSimulationInput = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$fixtures$2f$simulation$2d$input$2e$default$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"];
const measuredTotalSimulationInput = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$fixtures$2f$simulation$2d$input$2e$measured$2d$total$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"];
const waterInjectionSimulationInput = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$fixtures$2f$simulation$2d$input$2e$water$2d$injection$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/contracts/src/units.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Canonical units accepted at the versioned API boundary. */ __turbopack_context__.s([
    "CANONICAL_UNITS",
    ()=>CANONICAL_UNITS,
    "UNIT_DEFINITIONS",
    ()=>UNIT_DEFINITIONS
]);
const CANONICAL_UNITS = [
    "1",
    "1/mL",
    "1/s",
    "bar",
    "deg",
    "J/cycle",
    "K",
    "kJ/L",
    "L",
    "mg/cycle",
    "mg/L",
    "mL/cycle",
    "mm",
    "N/m",
    "nm",
    "Pa",
    "rpm",
    "s"
];
const UNIT_DEFINITIONS = {
    "1": {
        symbol: "1",
        quantity: "fraction",
        siScale: 1,
        siOffset: 0,
        siUnit: "1"
    },
    "1/mL": {
        symbol: "1/mL",
        quantity: "number density",
        siScale: 1e6,
        siOffset: 0,
        siUnit: "1/m3"
    },
    "1/s": {
        symbol: "1/s",
        quantity: "rate constant",
        siScale: 1,
        siOffset: 0,
        siUnit: "1/s"
    },
    bar: {
        symbol: "bar",
        quantity: "pressure",
        siScale: 1e5,
        siOffset: 0,
        siUnit: "Pa"
    },
    deg: {
        symbol: "deg",
        quantity: "crank angle",
        siScale: Math.PI / 180,
        siOffset: 0,
        siUnit: "rad"
    },
    "J/cycle": {
        symbol: "J/cycle",
        quantity: "energy per engine cycle",
        siScale: 1,
        siOffset: 0,
        siUnit: "J/cycle"
    },
    K: {
        symbol: "K",
        quantity: "temperature",
        siScale: 1,
        siOffset: 0,
        siUnit: "K"
    },
    "kJ/L": {
        symbol: "kJ/L",
        quantity: "volumetric energy density",
        siScale: 1e6,
        siOffset: 0,
        siUnit: "J/m3"
    },
    L: {
        symbol: "L",
        quantity: "volume",
        siScale: 1e-3,
        siOffset: 0,
        siUnit: "m3"
    },
    "mg/cycle": {
        symbol: "mg/cycle",
        quantity: "mass per engine cycle",
        siScale: 1e-6,
        siOffset: 0,
        siUnit: "kg/cycle"
    },
    "mg/L": {
        symbol: "mg/L",
        quantity: "mass concentration",
        siScale: 1e-3,
        siOffset: 0,
        siUnit: "kg/m3"
    },
    "mL/cycle": {
        symbol: "mL/cycle",
        quantity: "volume per engine cycle",
        siScale: 1e-6,
        siOffset: 0,
        siUnit: "m3/cycle"
    },
    mm: {
        symbol: "mm",
        quantity: "length",
        siScale: 1e-3,
        siOffset: 0,
        siUnit: "m"
    },
    "N/m": {
        symbol: "N/m",
        quantity: "surface tension",
        siScale: 1,
        siOffset: 0,
        siUnit: "N/m"
    },
    nm: {
        symbol: "nm",
        quantity: "length",
        siScale: 1e-9,
        siOffset: 0,
        siUnit: "m"
    },
    Pa: {
        symbol: "Pa",
        quantity: "pressure",
        siScale: 1,
        siOffset: 0,
        siUnit: "Pa"
    },
    rpm: {
        symbol: "rpm",
        quantity: "rotational speed",
        siScale: 2 * Math.PI / 60,
        siOffset: 0,
        siUnit: "rad/s"
    },
    s: {
        symbol: "s",
        quantity: "time",
        siScale: 1,
        siOffset: 0,
        siUnit: "s"
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/contracts/src/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$src$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/contracts/src/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/contracts/src/fixtures.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$src$2f$units$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/contracts/src/units.ts [app-client] (ecmascript)");
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/data/local.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LocalHydroCycleDataSource",
    ()=>LocalHydroCycleDataSource
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/contracts/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$src$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/contracts/src/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/view-model/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/fixtures.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$simulation$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/simulation-adapter.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$test$2d$run$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/test-run-adapter.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$simulation$2d$request$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/simulation-request.ts [app-client] (ecmascript)");
;
;
const client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$contracts$2f$src$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createHydroCycleClient"])("/gateway");
function errorMessage(error, response) {
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "detail" in error) {
        const detail = error.detail;
        if (typeof detail === "string") return detail;
    }
    return `${response.status} ${response.statusText}`;
}
class LocalHydroCycleDataSource {
    mode = "local";
    capabilities = {
        persistence: "durable",
        rawFileImport: true,
        export: true,
        mutation: true,
        simulation: true,
        advisory: "local-ollama",
        disabledReason: null
    };
    async health(options = {}) {
        const { data, error, response } = await client.GET("/api/v1/health", {
            signal: options.signal
        });
        if (!data) throw new Error(errorMessage(error, response));
        return {
            status: "ok",
            detail: "Local Cantera model service"
        };
    }
    async modelMetadata(options = {}) {
        const { data, error, response } = await client.GET("/api/v1/model-metadata", {
            signal: options.signal
        });
        if (!data) throw new Error(errorMessage(error, response));
        const metadata = data;
        return {
            solver: metadata.model_version,
            python: null,
            cantera: metadata.cantera_version ?? null,
            mechanism: metadata.mechanism ?? null,
            seed: null
        };
    }
    async simulate(input, options = {}) {
        const { data, error, response } = await client.POST("/api/v1/simulations", {
            body: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$simulation$2d$request$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["simulationRequest"])(input),
            ...options?.persistToTestRunId ? {
                params: {
                    query: {
                        persist: true,
                        test_run_id: options.persistToTestRunId
                    }
                }
            } : {},
            signal: options?.signal
        });
        if (!data) throw new Error(errorMessage(error, response));
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$simulation$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mapApiSimulationResult"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeSimulationFixture"])(input.fixture, input), data);
    }
    async listTestRuns(options = {}) {
        const { data, error, response } = await client.GET("/api/v1/test-runs", {
            signal: options.signal
        });
        if (!data) throw new Error(errorMessage(error, response));
        return data.map(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$test$2d$run$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mapApiTestRun"]);
    }
    async getTestRun(id, options = {}) {
        const { data, error, response } = await client.GET("/api/v1/test-runs/{test_run_id}", {
            params: {
                path: {
                    test_run_id: id
                }
            },
            signal: options.signal
        });
        if (!data) throw new Error(errorMessage(error, response));
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$test$2d$run$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mapApiTestRun"])(data);
    }
    async createTestRun(input, options = {}) {
        const { data, error, response } = await client.POST("/api/v1/test-runs", {
            body: input,
            signal: options.signal
        });
        if (!data) throw new Error(errorMessage(error, response));
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$test$2d$run$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mapApiTestRun"])(data);
    }
    async patchTestRun(id, input, options = {}) {
        const { data, error, response } = await client.PATCH("/api/v1/test-runs/{test_run_id}", {
            params: {
                path: {
                    test_run_id: id
                }
            },
            body: input,
            signal: options.signal
        });
        if (!data) throw new Error(errorMessage(error, response));
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$test$2d$run$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mapApiTestRun"])(data);
    }
    async deleteTestRun(id, expectedUpdatedAt, options = {}) {
        const { data, error, response } = await client.DELETE("/api/v1/test-runs/{test_run_id}", {
            params: {
                path: {
                    test_run_id: id
                },
                query: {
                    confirm: true,
                    expected_updated_at: expectedUpdatedAt
                }
            },
            signal: options.signal
        });
        if (!data) throw new Error(errorMessage(error, response));
    }
    async exportTestRun(id, expectedUpdatedAt, options = {}) {
        const url = new URL(`/gateway/api/v1/test-runs/${encodeURIComponent(id)}/export`, window.location.origin);
        url.searchParams.set("format", "canonical_json");
        url.searchParams.set("expected_updated_at", expectedUpdatedAt);
        const response = await fetch(url, {
            signal: options.signal
        });
        if (!response.ok) throw new Error(await response.text());
        const disposition = response.headers.get("content-disposition") ?? "";
        const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `hydrocycle-${id}.json`;
        return {
            blob: await response.blob(),
            filename
        };
    }
    async importTestRun(source, options = {}) {
        const query = new URLSearchParams({
            filename: source.file.name
        });
        if (source.testRunId) query.set("test_run_id", source.testRunId);
        if (source.expectedUpdatedAt) query.set("expected_updated_at", source.expectedUpdatedAt);
        if (source.calibrationReference) query.set("calibration_reference", source.calibrationReference);
        const response = await fetch(`/gateway/api/v1/test-runs/import?${query}`, {
            method: "POST",
            headers: {
                "content-type": source.file.type || "application/octet-stream"
            },
            body: source.file,
            signal: options.signal
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$test$2d$run$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mapApiTestRun"])(data.test_run);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/data/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$data$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/data/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$data$2f$fixture$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/data/fixture.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$data$2f$local$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/data/local.ts [app-client] (ecmascript)");
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/state/app-state.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HydroCycleProviders",
    ()=>HydroCycleProviders,
    "useHydroCycle",
    ()=>useHydroCycle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.2.11+d8250c1691f7ae7c/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/view-model/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/domain.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/view-model/src/fixtures.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$query$2d$core$40$5$2e$102$2e$8$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@tanstack+query-core@5.102.8/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$react$2d$query$40$5$2e$102$2e$8$2b$d86b59289c1a13ae$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@tanstack+react-query@5.102.8+d86b59289c1a13ae/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.2.11+d8250c1691f7ae7c/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$data$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/web/src/data/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$data$2f$fixture$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/data/fixture.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$data$2f$local$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/data/local.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function initialState() {
    const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$fixtures$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeSimulationFixture"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_INPUTS"].fixture, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_INPUTS"]);
    return {
        draft: {
            ...__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_INPUTS"]
        },
        frozen: null,
        result,
        running: false,
        error: null,
        selectedRunId: null,
        comparison: [
            null,
            null
        ],
        advisorContextKey: 0
    };
}
function reducer(state, action) {
    switch(action.type){
        case "patch-draft":
            return {
                ...state,
                draft: {
                    ...state.draft,
                    ...action.patch
                },
                error: null
            };
        case "reset-draft":
            return {
                ...state,
                draft: {
                    ...__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$view$2d$model$2f$src$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_INPUTS"]
                },
                error: null,
                advisorContextKey: state.advisorContextKey + 1
            };
        case "run-start":
            return {
                ...state,
                running: true,
                error: null
            };
        case "run-success":
            return {
                ...state,
                running: false,
                result: action.result,
                frozen: {
                    inputs: {
                        ...action.inputs
                    },
                    result: action.result,
                    submittedAt: new Date().toISOString()
                },
                advisorContextKey: state.advisorContextKey + 1
            };
        case "run-error":
            return {
                ...state,
                running: false,
                error: action.message
            };
        case "select-run":
            return {
                ...state,
                selectedRunId: action.id,
                advisorContextKey: state.advisorContextKey + 1
            };
        case "toggle-compare":
            {
                const [base, candidate] = state.comparison;
                const comparison = base === action.id ? [
                    candidate,
                    null
                ] : candidate === action.id ? [
                    base,
                    null
                ] : base === null ? [
                    action.id,
                    candidate
                ] : candidate === null ? [
                    base,
                    action.id
                ] : [
                    candidate,
                    action.id
                ];
                return {
                    ...state,
                    comparison,
                    advisorContextKey: state.advisorContextKey + 1
                };
            }
        case "reset-advisor":
            return {
                ...state,
                advisorContextKey: state.advisorContextKey + 1
            };
    }
}
const AppContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function AppStateProvider({ runtime, children }) {
    _s();
    const [state, dispatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useReducer"])(reducer, undefined, initialState);
    const dataSource = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AppStateProvider.useMemo[dataSource]": ()=>runtime.mode === "local" ? new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$data$2f$local$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LocalHydroCycleDataSource"]() : new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$data$2f$fixture$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FixtureHydroCycleDataSource"]()
    }["AppStateProvider.useMemo[dataSource]"], [
        runtime.mode
    ]);
    const controller = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const runSimulation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppStateProvider.useCallback[runSimulation]": async (persistToTestRunId, inputOverride)=>{
            controller.current?.abort();
            const active = new AbortController();
            controller.current = active;
            const submitted = {
                ...inputOverride ?? state.draft
            };
            dispatch({
                type: "run-start"
            });
            try {
                const result = await dataSource.simulate(submitted, {
                    signal: active.signal,
                    persistToTestRunId
                });
                if (!active.signal.aborted) dispatch({
                    type: "run-success",
                    inputs: submitted,
                    result
                });
            } catch (error) {
                if (!active.signal.aborted) {
                    dispatch({
                        type: "run-error",
                        message: error instanceof Error ? error.message : "Simulation failed."
                    });
                }
            } finally{
                if (controller.current === active) controller.current = null;
            }
        }
    }["AppStateProvider.useCallback[runSimulation]"], [
        dataSource,
        state.draft
    ]);
    const isDraftStale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AppStateProvider.useMemo[isDraftStale]": ()=>state.frozen !== null && JSON.stringify(state.frozen.inputs) !== JSON.stringify(state.draft)
    }["AppStateProvider.useMemo[isDraftStale]"], [
        state.draft,
        state.frozen
    ]);
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AppStateProvider.useMemo[value]": ()=>({
                runtime,
                dataSource,
                state,
                dispatch,
                runSimulation,
                cancelSimulation: ({
                    "AppStateProvider.useMemo[value]": ()=>controller.current?.abort()
                })["AppStateProvider.useMemo[value]"],
                isDraftStale,
                selectedRuns: ({
                    "AppStateProvider.useMemo[value]": (runs)=>state.comparison.map({
                            "AppStateProvider.useMemo[value]": (id)=>runs.find({
                                    "AppStateProvider.useMemo[value]": (run)=>run.id === id
                                }["AppStateProvider.useMemo[value]"])
                        }["AppStateProvider.useMemo[value]"]).filter({
                            "AppStateProvider.useMemo[value]": (run)=>Boolean(run)
                        }["AppStateProvider.useMemo[value]"])
                })["AppStateProvider.useMemo[value]"]
            })
    }["AppStateProvider.useMemo[value]"], [
        dataSource,
        isDraftStale,
        runSimulation,
        runtime,
        state
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AppContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/web/src/state/app-state.tsx",
        lineNumber: 216,
        columnNumber: 10
    }, this);
}
_s(AppStateProvider, "GRNCpaB1pY/F1z0jYNUXenYu6DA=");
_c = AppStateProvider;
function HydroCycleProviders({ runtime, children }) {
    _s1();
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "HydroCycleProviders.useState": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$query$2d$core$40$5$2e$102$2e$8$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
                defaultOptions: {
                    queries: {
                        retry: 1,
                        staleTime: 10_000
                    }
                }
            })
    }["HydroCycleProviders.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$react$2d$query$40$5$2e$102$2e$8$2b$d86b59289c1a13ae$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AppStateProvider, {
            runtime: runtime,
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/web/src/state/app-state.tsx",
            lineNumber: 234,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/src/state/app-state.tsx",
        lineNumber: 233,
        columnNumber: 5
    }, this);
}
_s1(HydroCycleProviders, "AF28i75htZOkSqgrVShAlOP9PM0=");
_c1 = HydroCycleProviders;
function useHydroCycle() {
    _s2();
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AppContext);
    if (!value) throw new Error("useHydroCycle must be used inside HydroCycleProviders.");
    return value;
}
_s2(useHydroCycle, "ksutO2/Ix3UeCrGnhyM+QEP505Y=");
var _c, _c1;
__turbopack_context__.k.register(_c, "AppStateProvider");
__turbopack_context__.k.register(_c1, "HydroCycleProviders");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/instrument-shell.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InstrumentShell",
    ()=>InstrumentShell
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.2.11+d8250c1691f7ae7c/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.544.0+d86b59289c1a13ae/node_modules/lucide-react/dist/esm/icons/activity.js [app-client] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$beaker$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Beaker$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.544.0+d86b59289c1a13ae/node_modules/lucide-react/dist/esm/icons/beaker.js [app-client] (ecmascript) <export default as Beaker>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.544.0+d86b59289c1a13ae/node_modules/lucide-react/dist/esm/icons/book-open.js [app-client] (ecmascript) <export default as BookOpen>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.544.0+d86b59289c1a13ae/node_modules/lucide-react/dist/esm/icons/database.js [app-client] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$gauge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Gauge$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.544.0+d86b59289c1a13ae/node_modules/lucide-react/dist/esm/icons/gauge.js [app-client] (ecmascript) <export default as Gauge>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings2$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.544.0+d86b59289c1a13ae/node_modules/lucide-react/dist/esm/icons/settings-2.js [app-client] (ecmascript) <export default as Settings2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.2.11+d8250c1691f7ae7c/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.2.11+d8250c1691f7ae7c/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$wave$2d$mark$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/components/wave-mark.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$state$2f$app$2d$state$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/state/app-state.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const routes = [
    {
        href: "/summary",
        label: "Summary",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$gauge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Gauge$3e$__["Gauge"]
    },
    {
        href: "/workbench",
        label: "Workbench",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$beaker$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Beaker$3e$__["Beaker"]
    },
    {
        href: "/test-runs",
        label: "Test Runs",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"]
    }
];
function InstrumentShell({ children }) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const { runtime } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$state$2f$app$2d$state$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHydroCycle"])();
    const workbench = pathname.endsWith("/workbench");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `instrument-shell ${workbench ? "instrument-shell--dark" : ""}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                className: "skip-link",
                href: "#main-content",
                children: "Skip to main content"
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: "instrument-nav",
                "aria-label": "Primary navigation",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        className: "instrument-brand",
                        href: "/summary",
                        "aria-label": "HydroCycle Summary",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$wave$2d$mark$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WaveMark"], {
                                className: "instrument-brand__mark"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                lineNumber: 41,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "HYDROCYCLE"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                lineNumber: 42,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                        lineNumber: 36,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        children: routes.map(({ href, label, icon: Icon })=>{
                            const active = pathname.endsWith(href);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                className: active ? "is-active" : "",
                                href: href,
                                "aria-current": active ? "page" : undefined,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                        size: 20,
                                        strokeWidth: 1.5
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                        lineNumber: 54,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: label
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                        lineNumber: 55,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, href, true, {
                                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                lineNumber: 48,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "instrument-nav__meta",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                        lineNumber: 62,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: runtime.mode === "local" ? "LOCAL" : "FIXTURE"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                        lineNumber: 63,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                lineNumber: 61,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__["BookOpen"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                        lineNumber: 66,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "0D / SINGLE-ZONE"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                        lineNumber: 67,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$544$2e$0$2b$d86b59289c1a13ae$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings2$3e$__["Settings2"], {
                                size: 16,
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                lineNumber: 69,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                        lineNumber: 60,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "instrument-content",
                children: [
                    runtime.mode === "hosted" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "fixture-disclosure",
                        role: "note",
                        children: "PUBLIC FIXTURE MODE · deterministic examples · session-only edits · no local network probing"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                        lineNumber: 74,
                        columnNumber: 11
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        id: "main-content",
                        tabIndex: -1,
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                        lineNumber: 79,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                lineNumber: 72,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "mobile-nav",
                "aria-label": "Mobile navigation",
                children: routes.map(({ href, label, icon: Icon })=>{
                    const active = pathname.endsWith(href);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        className: active ? "is-active" : "",
                        href: href,
                        "aria-current": active ? "page" : undefined,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                size: 19,
                                strokeWidth: 1.6
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                lineNumber: 93,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                                lineNumber: 94,
                                columnNumber: 15
                            }, this)
                        ]
                    }, href, true, {
                        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                        lineNumber: 87,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/src/components/instrument-shell.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
_s(InstrumentShell, "G/trVQqIlo7nMTJgRcUPPpggPkc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$2$2e$11$2b$d8250c1691f7ae7c$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$state$2f$app$2d$state$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHydroCycle"]
    ];
});
_c = InstrumentShell;
var _c;
__turbopack_context__.k.register(_c, "InstrumentShell");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_1vixf60._.js.map