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

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium text-slate-200">
                        Rotation {label}
                    </p>
                    <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-200">
                        degrees
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        aria-label={`Rotation ${label} in degrees`}
                        className="w-24 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-fuchsia-400/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/30"
                        type="number"
                        inputMode="numeric"
                        min={-180}
                        max={180}
                        step={1}
                        value={angleDeg}
                        onChange={(e) => applyAngle(Number(e.target.value))}
                    />
                    <span className="text-sm text-slate-400">°</span>
                </div>
            </div>

            <div className="mt-3">
                <input
                    aria-label={`Rotation ${label} slider`}
                    className="h-2 w-full accent-fuchsia-400"
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={angleDeg}
                    onChange={(e) => applyAngle(Number(e.target.value))}
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>-180°</span>
                    <span>0°</span>
                    <span>180°</span>
                </div>
            </div>
        </div>
    )
}

function GateButton({
    label,
    onClick,
}: {
    label: string
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
        >
            {label}
        </button>
    )
}

function InitStateButton({
    label,
    onClick,
}: {
    label: string
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
        >
            {label}
        </button>
    )
}

export default function Page() {
    const [state, setState] = useState<BlochVector>({ x: 0, y: 0, z: 1 })
    const [controlsResetKey, setControlsResetKey] = useState<number>(0)
    const [lastAction, setLastAction] = useState<string>('—')

    const stateSummary = useMemo(() => {
        const fmtComp = (n: number) => n.toFixed(3)
        const fmtDeg = (n: number) => `${n.toFixed(0)}°`

        const v = normalizeState(state)

        const [thetaDeg, phiDeg] = extractBlochAnglesDeg(state)

        return `x ${fmtComp(v.x)} · y ${fmtComp(v.y)} · z ${fmtComp(v.z)}  ~  θ ${fmtDeg(thetaDeg)} · φ ${fmtDeg(phiDeg)}`
    }, [state.x, state.y, state.z])

    const applyRotation = (axis: Axis, deltaDeg: number) => {
        const delta = Number.isFinite(deltaDeg) ? deltaDeg : 0
        if (delta === 0) return
        setState((prev) =>
            normalizeState(rotateStateAboutAxis(normalizeState(prev), axis, delta))
        )
        setLastAction(`Rotate state about ${axis.toUpperCase()} axis by ${delta.toFixed(0)}°`)
    }

    const applyGate = (gate: string) => {
        setState((prev) => applyGateToVector(prev, gate))
        setLastAction(`Gate: ${gate}`)
    }

    const reset = () => {
        setState({ x: 0, y: 0, z: 1 })
        setControlsResetKey((k) => k + 1)
        setLastAction('Reset rotations')
    }

    const set = (x: number, y: number, z: number) => {
        setState(normalizeState({ x, y, z }))
        setControlsResetKey((k) => k + 1)
        setLastAction(`Set state to [${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}]`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                            Quantum Bloch Sphere
                        </h1>
                        <p className="mt-1 text-sm text-slate-300">
                            Placeholder UI for Bloch Sphere Visualizer package — rotations + basic gates.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-xs text-slate-400">Current</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-100">
                            {stateSummary}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Last action: <span className="text-slate-200">{lastAction}</span>
                        </p>
                    </div>
                </header>

                <main className="mt-8 grid gap-6 lg:grid-cols-2">
                    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold text-slate-100">
                                Bloch Sphere
                            </h2>
                            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-200">
                                placeholder
                            </span>
                        </div>

                        <div className="mt-4 aspect-square w-full rounded-2xl bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-sky-500/15 p-[1px]">
                            <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50 px-6 text-center">
                                <p className="text-base font-semibold text-white">
                                    Bloch Sphere Visualization
                                </p>
                                <p className="mt-2 max-w-sm text-sm text-slate-300">
                                    Drop future <code className="rounded bg-white/10 px-1 py-0.5">&lt;BlochSphere /&gt;</code>{' '}
                                    component here.
                                </p>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                                        State: {stateSummary}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold text-slate-100">
                                Controls
                            </h2>
                            <button
                                type="button"
                                onClick={reset}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
                            >
                                Reset
                            </button>
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-slate-100">
                                    Initial States
                                </h3>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                <InitStateButton label="| 0 ⟩" onClick={() => set(0, 0, 1)} />
                                <InitStateButton label="| 1 ⟩" onClick={() => set(0, 0, -1)} />
                                <InitStateButton label="| + ⟩" onClick={() => set(1, 0, 0)} />
                                <InitStateButton label="| - ⟩" onClick={() => set(-1, 0, 0)} />
                                <InitStateButton label="| i ⟩" onClick={() => set(0, 1, 0)} />
                                <InitStateButton label="| -i ⟩" onClick={() => set(0, -1, 0)} />
                            </div>
                        </div>


                        <div className="mt-4 grid gap-4">
                            <AxisControl
                                axis="x"
                                resetKey={controlsResetKey}
                                onRotate={(delta) => applyRotation('x', delta)}
                            />
                            <AxisControl
                                axis="y"
                                resetKey={controlsResetKey}
                                onRotate={(delta) => applyRotation('y', delta)}
                            />
                            <AxisControl
                                axis="z"
                                resetKey={controlsResetKey}
                                onRotate={(delta) => applyRotation('z', delta)}
                            />
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-slate-100">
                                    Basic gates
                                </h3>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                <GateButton label="H" onClick={() => applyGate('H')} />
                                <GateButton label="X" onClick={() => applyGate('X')} />
                                <GateButton label="Y" onClick={() => applyGate('Y')} />
                                <GateButton label="Z" onClick={() => applyGate('Z')} />
                                <GateButton label="S" onClick={() => applyGate('S')} />
                                <GateButton label="T" onClick={() => applyGate('T')} />
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    )
}