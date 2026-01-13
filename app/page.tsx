'use client'

import { useEffect, useMemo, useState } from 'react'

type Axis = 'x' | 'y' | 'z'
type BlochVector = Record<Axis, number>
type Complex = [number, number]

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value))

const toRad = (deg: number) => (deg * Math.PI) / 180

const normalizeState = (v: BlochVector): BlochVector => {
    const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
    if (!Number.isFinite(r) || r === 0) return { x: 0, y: 0, z: 1 }
    return { x: v.x / r, y: v.y / r, z: v.z / r }
}

const rotateStateAboutAxis = (v: BlochVector, axis: Axis, deg: number): BlochVector => {
    const theta = toRad(deg)
    const c = Math.cos(theta)
    const s = Math.sin(theta)

    const { x, y, z } = v

    if (axis === 'x') {
        return { x, y: y * c - z * s, z: y * s + z * c }
    }
    if (axis === 'y') {
        return { x: x * c + z * s, y, z: -x * s + z * c }
    }
    return { x: x * c - y * s, y: x * s + y * c, z }
}

const extractBlochAnglesDeg = (state: BlochVector): [number, number] => {
    const v = normalizeState(state)

    const toDeg = (rad: number) => (rad * 180) / Math.PI
    const clampUnit = (val: number) => Math.min(1, Math.max(-1, val))

    const thetaDeg = toDeg(Math.acos(clampUnit(v.z)))
    const phiDeg = toDeg(Math.atan2(v.y, v.x))

    return [thetaDeg, phiDeg]
}

const extractQuantumAmplitudes = (state: BlochVector): [Complex, Complex] => {
    const [thetaDeg, phiDeg] = extractBlochAnglesDeg(state)
    const thetaRad = (thetaDeg * Math.PI) / 180
    const phiRad = (phiDeg * Math.PI) / 180

    const alpha: Complex = [Math.cos(thetaRad / 2), 0]
    const beta: Complex = [Math.sin(thetaRad / 2) * Math.cos(phiRad), Math.sin(thetaRad / 2) * Math.sin(phiRad)]

    return [alpha, beta]
}

const extractBlochVectorFromAmplitudes = (alpha: Complex, beta: Complex): BlochVector => {
    const [aRe, aIm] = alpha
    const [bRe, bIm] = beta

    const x = 2 * (aRe * bRe + aIm * bIm)
    const y = 2 * (aIm * bRe - aRe * bIm)
    const z = aRe * aRe + aIm * aIm - bRe * bRe - bIm * bIm

    return normalizeState({ x, y, z })
}

const applyGateToState = (alpha: Complex, beta: Complex, gate: string): [Complex, Complex] => {
    switch (gate) {
        case 'H':
            return [[
                (alpha[0] + beta[0]) / Math.sqrt(2),
                (alpha[1] + beta[1]) / Math.sqrt(2),
            ],
            [
                (alpha[0] - beta[0]) / Math.sqrt(2),
                (alpha[1] - beta[1]) / Math.sqrt(2),
            ]]
        case 'X':
            return [beta, alpha]
        case 'Y':
            return [[-beta[1], beta[0]], [alpha[1], -alpha[0]]]
        case 'Z':
            return [[alpha[0], alpha[1]], [-beta[0], -beta[1]]]
        case 'S':
            return [alpha, [-beta[1], beta[0]]]
        case 'T':
            return [alpha, [
                (beta[0] + -beta[1]) / Math.sqrt(2),
                (beta[0] + beta[1]) / Math.sqrt(2),
            ]]
        default:
            return [alpha, beta]
    }
}

const applyGateToVector = (state: BlochVector, gate: string): BlochVector => {
    const [alpha, beta] = extractQuantumAmplitudes(state)
    const [resultAlpha, resultBeta] = applyGateToState(alpha, beta, gate)
    return extractBlochVectorFromAmplitudes(resultAlpha, resultBeta)
}

// Blueprint-style Bloch sphere visualization
function BlueprintSphere({ state }: { state: BlochVector }) {
    const v = normalizeState(state)
    const cx = 200 + v.x * 120
    const cy = 200 - v.z * 120

    // Softer, muted color palette
    const colors = {
        line: 'rgba(107, 163, 190, 0.25)',
        lineBright: 'rgba(107, 163, 190, 0.4)',
        accent: '#6ba3be',
        accentDim: 'rgba(107, 163, 190, 0.5)',
        grid: 'rgba(107, 163, 190, 0.06)',
        gridMajor: 'rgba(107, 163, 190, 0.12)',
        text: 'rgba(107, 163, 190, 0.6)',
    }

    return (
        <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Background grid lines */}
            <defs>
                <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke={colors.grid} strokeWidth="0.5" />
                </pattern>
                <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                    <rect width="100" height="100" fill="url(#smallGrid)" />
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke={colors.gridMajor} strokeWidth="1" />
                </pattern>
            </defs>

            <rect width="400" height="400" fill="url(#grid)" />

            {/* Outer circle - main sphere outline */}
            <circle cx="200" cy="200" r="140" fill="none" stroke={colors.lineBright} strokeWidth="1" />

            <text x="200" y="200" textAnchor="middle" dominantBaseline="middle" fill={colors.text} className="mono text-xs">Placeholder</text>
        </svg>
    )
}

function AxisControl({
    axis,
    resetKey,
    onRotate,
}: {
    axis: Axis
    resetKey: number
    onRotate: (deltaDeg: number) => void
}) {
    const label = axis.toUpperCase()
    const [angleDeg, setAngleDeg] = useState<number>(0)

    useEffect(() => {
        setAngleDeg(0)
    }, [resetKey])

    const applyAngle = (raw: number) => {
        const next = clamp(Number.isFinite(raw) ? raw : 0, -180, 180)
        const delta = next - angleDeg
        setAngleDeg(next)
        if (delta !== 0) onRotate(delta)
    }

    const axisColors: Record<Axis, string> = {
        x: '#c47070',
        y: '#70b088',
        z: '#6ba3be',
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: axisColors[axis] }}
                    />
                    <span className="tech-header text-xs" style={{ color: axisColors[axis] }}>
                        R<sub>{label}</sub>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        aria-label={`Rotation ${label} in degrees`}
                        className="tech-input w-20 text-right"
                        type="number"
                        inputMode="numeric"
                        min={-180}
                        max={180}
                        step={1}
                        value={angleDeg}
                        onChange={(e) => applyAngle(Number(e.target.value))}
                    />
                    <span className="text-[var(--white-muted)] text-sm">DEG</span>
                </div>
            </div>

            <div className="slider-container">
                <input
                    aria-label={`Rotation ${label} slider`}
                    className="tech-slider"
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={angleDeg}
                    onChange={(e) => applyAngle(Number(e.target.value))}
                />
            </div>

            <div className="flex justify-between text-[10px] text-[var(--white-muted)] mono">
                <span>-180</span>
                <span>0</span>
                <span>+180</span>
            </div>
        </div>
    )
}

function GateButton({
    label,
    onClick,
    variant = 'default',
}: {
    label: string
    onClick: () => void
    variant?: 'default' | 'pauli'
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`gate-btn ${variant === 'pauli' ? 'pauli' : ''}`}
        >
            {label}
        </button>
    )
}

function StateButton({
    label,
    onClick,
    active = false,
}: {
    label: string
    onClick: () => void
    active?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`state-btn ${active ? 'active' : ''}`}
        >
            {label}
        </button>
    )
}

export default function Page() {
    const [state, setState] = useState<BlochVector>({ x: 0, y: 0, z: 1 })
    const [controlsResetKey, setControlsResetKey] = useState<number>(0)
    const [lastAction, setLastAction] = useState<string>('System initialized')
    const [activeState, setActiveState] = useState<string>('|0⟩')

    const stateData = useMemo(() => {
        const v = normalizeState(state)
        const [thetaDeg, phiDeg] = extractBlochAnglesDeg(state)
        return { v, thetaDeg, phiDeg }
    }, [state.x, state.y, state.z])

    const applyRotation = (axis: Axis, deltaDeg: number) => {
        const delta = Number.isFinite(deltaDeg) ? deltaDeg : 0
        if (delta === 0) return
        setState((prev) =>
            normalizeState(rotateStateAboutAxis(normalizeState(prev), axis, delta))
        )
        setLastAction(`ROTATE: R_${axis.toUpperCase()}(${delta.toFixed(0)}°)`)
        setActiveState('')
    }

    const applyGate = (gate: string) => {
        setState((prev) => applyGateToVector(prev, gate))
        setLastAction(`GATE APPLIED: ${gate}`)
        setActiveState('')
    }

    const reset = () => {
        setState({ x: 0, y: 0, z: 1 })
        setControlsResetKey((k) => k + 1)
        setLastAction('SYSTEM RESET')
        setActiveState('|0⟩')
    }

    const set = (x: number, y: number, z: number, name: string) => {
        setState(normalizeState({ x, y, z }))
        setControlsResetKey((k) => k + 1)
        setLastAction(`STATE SET: ${name}`)
        setActiveState(name)
    }

    return (
        <div className="min-h-screen blueprint-grid scanlines">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                            </div>
                            <h1 className="tech-header text-3xl text-glow text-[var(--cyan)]">
                                Quantum State Visualizer
                            </h1>
                            <p className="text-[var(--white-muted)] text-sm mt-2 mono">
                                Bloch Sphere Interface | Single Qubit Analysis
                            </p>
                        </div>
                    </div>

                    <div className="tech-divider mt-6" />
                </header>

                <main className="grid gap-8 lg:grid-cols-3">
                    {/* Bloch Sphere Visualization */}
                    <section className="lg:col-span-2">
                        <div className="tech-panel corner-brackets p-1 glow-cyan">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="section-header tech-header text-sm text-[var(--cyan)]">
                                        Bloch Sphere
                                    </h2>
                                </div>

                                <div className="aspect-square bg-[var(--bp-bg)] relative">
                                    <BlueprintSphere state={state} />

                                    {/* Corner markers */}
                                    <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[var(--cyan)] opacity-50" />
                                    <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[var(--cyan)] opacity-50" />
                                    <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[var(--cyan)] opacity-50" />
                                    <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[var(--cyan)] opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* State Data Panel */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="tech-panel p-4">
                                <h3 className="tech-label mb-3">Cartesian Coordinates</h3>
                                <div className="space-y-2">
                                    {(['x', 'y', 'z'] as const).map((axis) => (
                                        <div key={axis} className="flex items-center justify-between">
                                            <span className="text-[var(--white-muted)] text-sm uppercase">{axis}</span>
                                            <span className="data-value">{stateData.v[axis].toFixed(4)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="tech-panel p-4">
                                <h3 className="tech-label mb-3">Spherical Coordinates</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[var(--white-muted)] text-sm">THETA (θ)</span>
                                        <span className="data-value">{stateData.thetaDeg.toFixed(2)}°</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[var(--white-muted)] text-sm">PHI (φ)</span>
                                        <span className="data-value">{stateData.phiDeg.toFixed(2)}°</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[var(--white-muted)] text-sm">RADIUS</span>
                                        <span className="data-value">1.0000</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Controls Panel */}
                    <section className="space-y-6">
                        {/* Basis States */}
                        <div className="tech-panel corner-brackets p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="section-header tech-header text-sm text-[var(--cyan)]">
                                    Basis States
                                </h2>
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="tech-btn amber text-xs"
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <StateButton label="|0⟩" onClick={() => set(0, 0, 1, '|0⟩')} active={activeState === '|0⟩'} />
                                <StateButton label="|1⟩" onClick={() => set(0, 0, -1, '|1⟩')} active={activeState === '|1⟩'} />
                                <StateButton label="|+⟩" onClick={() => set(1, 0, 0, '|+⟩')} active={activeState === '|+⟩'} />
                                <StateButton label="|−⟩" onClick={() => set(-1, 0, 0, '|−⟩')} active={activeState === '|−⟩'} />
                                <StateButton label="|+i⟩" onClick={() => set(0, 1, 0, '|+i⟩')} active={activeState === '|+i⟩'} />
                                <StateButton label="|−i⟩" onClick={() => set(0, -1, 0, '|−i⟩')} active={activeState === '|−i⟩'} />
                            </div>
                        </div>

                        {/* Rotation Controls */}
                        <div className="tech-panel corner-brackets p-4">
                            <h2 className="section-header tech-header text-sm text-[var(--cyan)] mb-4">
                                Rotation Matrix
                            </h2>

                            <div className="space-y-6">
                                <AxisControl
                                    axis="x"
                                    resetKey={controlsResetKey}
                                    onRotate={(delta) => applyRotation('x', delta)}
                                />
                                <div className="tech-divider" />
                                <AxisControl
                                    axis="y"
                                    resetKey={controlsResetKey}
                                    onRotate={(delta) => applyRotation('y', delta)}
                                />
                                <div className="tech-divider" />
                                <AxisControl
                                    axis="z"
                                    resetKey={controlsResetKey}
                                    onRotate={(delta) => applyRotation('z', delta)}
                                />
                            </div>
                        </div>

                        {/* Quantum Gates */}
                        <div className="tech-panel corner-brackets p-4">
                            <h2 className="section-header tech-header text-sm text-[var(--cyan)] mb-4">
                                Quantum Gates
                            </h2>

                            <div className="mb-3">
                                <span className="tech-label">Pauli Gates</span>
                                <div className="flex gap-2 mt-2">
                                    <GateButton label="X" onClick={() => applyGate('X')} variant="pauli" />
                                    <GateButton label="Y" onClick={() => applyGate('Y')} variant="pauli" />
                                    <GateButton label="Z" onClick={() => applyGate('Z')} variant="pauli" />
                                </div>
                            </div>

                            <div>
                                <span className="tech-label">Phase Gates</span>
                                <div className="flex gap-2 mt-2">
                                    <GateButton label="H" onClick={() => applyGate('H')} />
                                    <GateButton label="S" onClick={() => applyGate('S')} />
                                    <GateButton label="T" onClick={() => applyGate('T')} />
                                </div>
                            </div>
                        </div>

                        {/* Status Log */}
                        <div className="tech-panel p-4 border-l-2 border-l-[var(--cyan)]">
                            <div className="tech-label mb-2">Last Operation</div>
                            <div className="mono text-sm text-[var(--cyan)] py-1">
                                {lastAction}
                            </div>
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className="mt-12 pt-6">
                    <div className="tech-divider mb-6" />
                    <div className="flex items-center justify-between text-[var(--white-muted)]">
                        <div className="flex items-center gap-6">
                            <span className="tech-label">Quantum Bloch Sphere</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}
