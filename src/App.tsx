/**
 * Paintball Day Planner
 * Single-file, mobile-first group trip planner (dates, restaurant, package & carpooling)
 * with live polling statistics. State is persisted in localStorage to simulate a
 * shared, real-time database.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar,
  Utensils,
  Target,
  Car,
  Check,
  Plus,
  Users,
  ArrowRight,
  Crosshair,
  Crown,
  Moon,
  Infinity as InfinityIcon,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type MultiKind = 'dates' | 'restaurants';

interface CarT {
  id: string;
  name: string;
  seats: (string | null)[]; // length 5, index 0 = driver
}

interface PlannerState {
  dates: Record<string, string[]>; // optionId -> voter names
  restaurants: Record<string, string[]>; // optionId -> voter names
  packages: Record<string, string>; // userName -> packageId (single choice)
  cars: CarT[];
}

interface LabelOpt {
  id: string;
  label: string;
  sub: string;
}

interface PkgOpt {
  id: string;
  title: string;
  price: number;
  icon: LucideIcon;
}

/* -------------------------------------------------------------------------- */
/*  Static poll options                                                        */
/* -------------------------------------------------------------------------- */

const DATE_OPTIONS: LabelOpt[] = [
  { id: 'd1', label: 'Sa. 20. Juni', sub: '2026 · ab 14:00 Uhr' },
  { id: 'd2', label: 'Sa. 27. Juni', sub: '2026 · ab 14:00 Uhr' },
  { id: 'd3', label: 'Sa. 4. Juli', sub: '2026 · ab 14:00 Uhr' },
];

const RESTAURANT_OPTIONS: LabelOpt[] = [
  { id: 'r1', label: 'Steakhouse 64', sub: 'Steak & Grill' },
  { id: 'r2', label: 'Pizzeria Bella', sub: 'Italienisch' },
  { id: 'r3', label: 'Flammkuchen Haus', sub: 'Elsässisch' },
];

const PACKAGE_OPTIONS: PkgOpt[] = [
  { id: 'p1', title: '200 Schüsse', price: 30, icon: Crosshair },
  { id: 'p2', title: 'Unendlich Schüsse', price: 60, icon: InfinityIcon },
  { id: 'p3', title: 'Unendlich + Übernachtung', price: 90, icon: Moon },
];

/* -------------------------------------------------------------------------- */
/*  Persistence                                                                */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'paintball_planner_v1';
const USER_KEY = 'paintball_user_v1';

function getInitialState(): PlannerState {
  // Realistic, pre-populated mock data so the app feels lived-in from the start.
  return {
    dates: {
      d1: ['Lukas', 'Mia', 'Jonas', 'Emma'],
      d2: ['Lukas', 'Mia', 'Jonas', 'Noah', 'Lena'],
      d3: ['Emma', 'Noah'],
    },
    restaurants: {
      r1: ['Lukas', 'Mia', 'Noah'],
      r2: ['Mia', 'Jonas', 'Emma', 'Lena'],
      r3: ['Lukas', 'Jonas'],
    },
    packages: {
      Lukas: 'p2',
      Mia: 'p2',
      Jonas: 'p1',
      Emma: 'p2',
      Noah: 'p3',
      Lena: 'p1',
    },
    cars: [
      { id: 'c1', name: 'Auto 1', seats: ['Lukas', 'Mia', 'Jonas', null, null] },
      { id: 'c2', name: 'Auto 2', seats: ['Emma', 'Noah', null, null, null] },
      { id: 'c3', name: 'Auto 3', seats: ['Lena', null, null, null, null] },
      { id: 'c4', name: 'Auto 4', seats: [null, null, null, null, null] },
    ],
  };
}

function loadState(): PlannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        parsed.dates &&
        parsed.restaurants &&
        parsed.packages &&
        Array.isArray(parsed.cars)
      ) {
        return parsed as PlannerState;
      }
    }
  } catch (e) {
    console.error('Konnte gespeicherten Status nicht laden:', e);
  }
  return getInitialState();
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;

const initials = (n: string) => {
  const parts = n.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

function multiStats(map: Record<string, string[]>, options: LabelOpt[]) {
  const counts = options.map((o) => {
    const voters = map[o.id] || [];
    return { ...o, voters, count: voters.length };
  });
  const max = counts.reduce((m, c) => Math.max(m, c.count), 0);
  const winners = max > 0 ? counts.filter((c) => c.count === max).map((c) => c.label) : [];
  return { counts, max, winners };
}

function packageStats(packages: Record<string, string>, options: PkgOpt[]) {
  const counts = options.map((o) => {
    const voters = Object.keys(packages).filter((name) => packages[name] === o.id);
    return { ...o, voters, count: voters.length };
  });
  const max = counts.reduce((m, c) => Math.max(m, c.count), 0);
  const winners = max > 0 ? counts.filter((c) => c.count === max).map((c) => c.title) : [];
  return { counts, max, winners };
}

/* -------------------------------------------------------------------------- */
/*  Presentational building blocks                                             */
/* -------------------------------------------------------------------------- */

function ProgressBar({ value, max, active }: { value: number; max: number; active: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-[#e6e6eb]">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: active ? '#0071e3' : '#1d1d1f' }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      />
    </div>
  );
}

function VoterList({ voters, currentUser }: { voters: string[]; currentUser: string }) {
  if (voters.length === 0) {
    return <p className="text-[11px] text-[#bcbcc2]">Noch keine Stimmen</p>;
  }
  return (
    <p className="text-[11px] leading-relaxed text-[#86868b]">
      {voters.map((v, i) => {
        const me = currentUser !== '' && v === currentUser;
        return (
          <span key={v + i}>
            <span className={me ? 'font-semibold text-[#1D1D1F]' : ''}>
              {v}
              {me ? ' (Du)' : ''}
            </span>
            {i < voters.length - 1 ? ', ' : ''}
          </span>
        );
      })}
    </p>
  );
}

function CheckBox({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border transition-colors ${
        selected ? 'border-[#0071e3] bg-[#0071e3]' : 'border-[#cfcfd4] bg-white'
      }`}
    >
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <Check size={14} strokeWidth={3} className="text-white" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        selected ? 'border-[#0071e3]' : 'border-[#cfcfd4]'
      }`}
    >
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="h-[11px] w-[11px] rounded-full bg-[#0071e3]"
          />
        )}
      </AnimatePresence>
    </span>
  );
}

interface MultiOptionProps {
  label: string;
  sub?: string;
  count: number;
  max: number;
  voters: string[];
  selected: boolean;
  currentUser: string;
  onClick: () => void;
}

function MultiOption({ label, sub, count, max, voters, selected, currentUser, onClick }: MultiOptionProps) {
  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`w-full rounded-2xl p-3.5 text-left transition-all ${
        selected ? 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <CheckBox selected={selected} />
        <div className="min-w-0 grow">
          <p className="truncate text-[15px] font-medium tracking-tight text-[#1D1D1F]">{label}</p>
          {sub && <p className="mt-0.5 truncate text-[12px] text-[#86868b]">{sub}</p>}
        </div>
        <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[#1D1D1F]">{count}</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={count} max={max} active={selected} />
      </div>
      <div className="mt-2">
        <VoterList voters={voters} currentUser={currentUser} />
      </div>
    </motion.button>
  );
}

interface PackageOptionProps {
  icon: LucideIcon;
  title: string;
  price: number;
  count: number;
  max: number;
  voters: string[];
  selected: boolean;
  currentUser: string;
  onClick: () => void;
}

function PackageOption({
  icon: Icon,
  title,
  price,
  count,
  max,
  voters,
  selected,
  currentUser,
  onClick,
}: PackageOptionProps) {
  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        selected
          ? 'border-[#0071e3] bg-white shadow-[0_4px_16px_rgba(0,113,227,0.12)]'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${
            selected ? 'bg-[#0071e3] text-white' : 'border border-[#e8e8ed] bg-white text-[#1D1D1F]'
          }`}
        >
          <Icon size={20} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 grow">
          <p className="truncate text-[15px] font-semibold tracking-tight text-[#1D1D1F]">{title}</p>
          <p className="mt-0.5 text-[12px] text-[#86868b]">3 Stunden Paintball</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[17px] font-semibold tabular-nums text-[#1D1D1F]">{price}€</span>
          <RadioDot selected={selected} />
        </div>
      </div>
      <div className="mt-3.5">
        <ProgressBar value={count} max={max} active={selected} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <VoterList voters={voters} currentUser={currentUser} />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-[#86868b]">
          {count} {count === 1 ? 'Stimme' : 'Stimmen'}
        </span>
      </div>
    </motion.button>
  );
}

interface SeatProps {
  name: string | null;
  isDriver?: boolean;
  isMe: boolean;
  onClick: () => void;
}

function Seat({ name, isDriver = false, isMe, onClick }: SeatProps) {
  const occupied = !!name;
  const clickable = !occupied || isMe; // join a free seat, or leave your own
  return (
    <div className="flex w-[64px] flex-col items-center gap-1.5">
      <span className="h-3 text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-[#86868b]">
        {isDriver ? 'Fahrer' : ''}
      </span>
      <motion.button
        type="button"
        layout
        whileTap={clickable ? { scale: 0.9 } : undefined}
        onClick={clickable ? onClick : undefined}
        aria-label={
          occupied
            ? isMe
              ? 'Deinen Platz verlassen'
              : `Belegt von ${name}`
            : 'Freier Platz – eintragen'
        }
        className={`relative flex h-[54px] w-[54px] items-center justify-center rounded-full transition-colors ${
          occupied
            ? isMe
              ? 'bg-[#0071e3] text-white shadow-[0_4px_14px_rgba(0,113,227,0.32)]'
              : 'border border-[#e8e8ed] bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
            : 'border border-dashed border-[#cfcfd4] bg-transparent text-[#c2c2c8] hover:border-[#0071e3] hover:text-[#0071e3]'
        } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {occupied ? (
            <motion.span
              key="name"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="text-[14px] font-semibold"
            >
              {initials(name as string)}
            </motion.span>
          ) : (
            <motion.span
              key="plus"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              <Plus size={20} strokeWidth={1.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <span className="h-3 max-w-[64px] truncate text-[11px] leading-none text-[#86868b]">
        {occupied ? firstName(name as string) : 'Frei'}
      </span>
    </div>
  );
}

interface CarCardProps {
  car: CarT;
  currentUser: string;
  onSeat: (carId: string, seatIdx: number) => void;
}

function CarCard({ car, currentUser, onSeat }: CarCardProps) {
  const occ = car.seats.filter(Boolean).length;
  const seatAt = (i: number) => car.seats[i] ?? null;
  const mine = (i: number) => currentUser !== '' && seatAt(i) === currentUser;
  return (
    <motion.div
      layout
      className="rounded-3xl border border-[#ececef] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f5f5f7] text-[#1D1D1F]">
            <Car size={17} strokeWidth={1.5} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-[#1D1D1F]">{car.name}</span>
        </div>
        <span className="text-[12px] font-medium tabular-nums text-[#86868b]">{occ}/5</span>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Front row: driver + co-driver */}
        <div className="grid grid-cols-2 gap-6">
          <Seat name={seatAt(0)} isDriver isMe={mine(0)} onClick={() => onSeat(car.id, 0)} />
          <Seat name={seatAt(1)} isMe={mine(1)} onClick={() => onSeat(car.id, 1)} />
        </div>
        {/* Back row: three passengers */}
        <div className="grid grid-cols-3 gap-3">
          {[2, 3, 4].map((i) => (
            <Seat key={i} name={seatAt(i)} isMe={mine(i)} onClick={() => onSeat(car.id, i)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Leader({ winners }: { winners: string[] }) {
  return (
    <div className="ml-0.5 mt-3 flex items-center gap-1.5">
      <Crown size={13} strokeWidth={1.5} className="shrink-0 text-[#0071e3]" />
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">
        Meistgewählt
      </span>
      <span className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-[#86868b]">
        · {winners.length ? winners.join(' · ') : 'Noch offen'}
      </span>
    </div>
  );
}

interface SectionProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  leader?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, subtitle, leader, children }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[28px] bg-[#f5f5f7] p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Icon size={20} strokeWidth={1.5} />
        </span>
        <div className="pt-0.5">
          <h2 className="text-[19px] font-semibold leading-tight tracking-tight text-[#1D1D1F]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-[#86868b]">{subtitle}</p>}
        </div>
      </div>
      {leader}
      <div className="mt-4 space-y-1">{children}</div>
    </motion.section>
  );
}

/* -------------------------------------------------------------------------- */
/*  App                                                                        */
/* -------------------------------------------------------------------------- */

export default function App() {
  const [state, setState] = useState<PlannerState>(() => loadState());
  const [currentUser, setCurrentUser] = useState<string>(() => {
    try {
      return localStorage.getItem(USER_KEY) || '';
    } catch {
      return '';
    }
  });
  const [draft, setDraft] = useState('');
  const [nameError, setNameError] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);

  // Persist shared state.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Speichern fehlgeschlagen:', e);
    }
  }, [state]);

  // Persist the logged-in identity.
  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem(USER_KEY, currentUser);
      else localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Speichern des Nutzers fehlgeschlagen:', e);
    }
  }, [currentUser]);

  /* ----- derived stats ----- */
  const dateStats = useMemo(() => multiStats(state.dates, DATE_OPTIONS), [state.dates]);
  const restStats = useMemo(() => multiStats(state.restaurants, RESTAURANT_OPTIONS), [state.restaurants]);
  const pkgStats = useMemo(() => packageStats(state.packages, PACKAGE_OPTIONS), [state.packages]);

  const seated = useMemo(
    () => state.cars.reduce((n, c) => n + c.seats.filter(Boolean).length, 0),
    [state.cars],
  );

  const participants = useMemo(() => {
    const set = new Set<string>();
    Object.values(state.dates).forEach((arr) => arr.forEach((n) => set.add(n)));
    Object.values(state.restaurants).forEach((arr) => arr.forEach((n) => set.add(n)));
    Object.keys(state.packages).forEach((n) => set.add(n));
    state.cars.forEach((c) => c.seats.forEach((s) => s && set.add(s)));
    if (currentUser) set.add(currentUser);
    return set.size;
  }, [state, currentUser]);

  /* ----- gate: a name is required before interacting ----- */
  const requireUser = () => {
    if (currentUser) return true;
    setNameError(true);
    loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => inputRef.current?.focus(), 350);
    return false;
  };

  /* ----- handlers ----- */
  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    const n = draft.trim();
    if (!n) return;
    setCurrentUser(n);
    setDraft('');
    setNameError(false);
  };

  const toggleMulti = (kind: MultiKind, id: string) => {
    if (!requireUser()) return;
    setState((prev) => {
      const map = { ...prev[kind] };
      const existing = map[id] || [];
      const has = existing.includes(currentUser);
      map[id] = has ? existing.filter((n) => n !== currentUser) : [...existing, currentUser];
      return { ...prev, [kind]: map };
    });
  };

  const choosePackage = (id: string) => {
    if (!requireUser()) return;
    setState((prev) => {
      const packages = { ...prev.packages };
      if (packages[currentUser] === id) delete packages[currentUser];
      else packages[currentUser] = id;
      return { ...prev, packages };
    });
  };

  const takeSeat = (carId: string, seatIdx: number) => {
    if (!requireUser()) return;
    setState((prev) => {
      const cars = prev.cars.map((c) => ({ ...c, seats: [...c.seats] }));
      const target = cars.find((c) => c.id === carId);
      if (!target) return prev;
      const occupant = target.seats[seatIdx] ?? null;

      if (occupant === currentUser) {
        // Tapping your own seat leaves it.
        target.seats[seatIdx] = null;
        return { ...prev, cars };
      }
      if (occupant) return prev; // someone else's seat — no double booking, no kicking

      // Free seat: remove the user from any current seat, then sit here.
      cars.forEach((c) => {
        c.seats = c.seats.map((s) => (s === currentUser ? null : s));
      });
      const fresh = cars.find((c) => c.id === carId)!;
      fresh.seats[seatIdx] = currentUser;
      return { ...prev, cars };
    });
  };

  const handleReset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      setTimeout(() => setResetArmed(false), 3000);
      return;
    }
    setState(getInitialState());
    setResetArmed(false);
  };

  /* ----- render ----- */
  return (
    <div className="flex min-h-screen w-full justify-center bg-[#f5f5f7]">
      <div className="min-h-screen w-full max-w-[440px] bg-white sm:shadow-[0_0_80px_rgba(0,0,0,0.07)]">
        <div className="space-y-7 px-5 pb-16 pt-12">
          {/* ---------- Hero ---------- */}
          <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Crosshair size={18} strokeWidth={1.5} className="text-[#0071e3]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#86868b]">
                Gruppenausflug
              </span>
            </div>
            <h1 className="text-[38px] font-semibold leading-[1.08] tracking-tight text-[#1D1D1F]">
              Paintball Day
            </h1>
            <p className="mt-3 max-w-[330px] text-[15px] leading-relaxed text-[#86868b]">
              Stimmt über Termin, Paket und Restaurant ab — und teilt euch auf die Autos auf. Alles an
              einem Ort.
            </p>
          </motion.header>

          {/* ---------- Login ---------- */}
          <motion.div
            ref={loginRef}
            animate={nameError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-[24px] bg-[#f5f5f7] p-4"
          >
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0071e3] text-[15px] font-semibold text-white">
                    {initials(currentUser)}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#86868b]">
                      Angemeldet als
                    </p>
                    <p className="text-[16px] font-semibold tracking-tight text-[#1D1D1F]">
                      {currentUser}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser('');
                    setDraft('');
                  }}
                  className="px-2 py-1 text-[13px] font-medium text-[#0071e3]"
                >
                  Wechseln
                </button>
              </div>
            ) : (
              <form onSubmit={submitName}>
                <label
                  htmlFor="name-input"
                  className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b]"
                >
                  Dein Name
                </label>
                <div className="relative mt-2">
                  <input
                    id="name-input"
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      if (nameError) setNameError(false);
                    }}
                    placeholder="Wie heißt du?"
                    autoComplete="off"
                    className="w-full rounded-2xl border border-transparent bg-white py-3.5 pl-4 pr-12 text-[16px] text-[#1D1D1F] outline-none transition-colors placeholder:text-[#b0b0b5] focus:border-[#0071e3]"
                  />
                  <AnimatePresence>
                    {draft.trim() && (
                      <motion.button
                        type="submit"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        aria-label="Namen bestätigen"
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#0071e3] text-white shadow-[0_2px_8px_rgba(0,113,227,0.35)]"
                      >
                        <ArrowRight size={18} strokeWidth={2} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            )}
            <AnimatePresence>
              {nameError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 px-1 text-[12px] text-[#0071e3]"
                >
                  Bitte gib zuerst deinen Namen ein, um abzustimmen.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ---------- Termine ---------- */}
          <Section
            icon={Calendar}
            title="Termine"
            subtitle="Wann hast du Zeit? · Mehrfachauswahl"
            leader={<Leader winners={dateStats.winners} />}
          >
            {dateStats.counts.map((o) => (
              <MultiOption
                key={o.id}
                label={o.label}
                sub={o.sub}
                count={o.count}
                max={dateStats.max}
                voters={o.voters}
                selected={currentUser !== '' && o.voters.includes(currentUser)}
                currentUser={currentUser}
                onClick={() => toggleMulti('dates', o.id)}
              />
            ))}
          </Section>

          {/* ---------- Restaurant ---------- */}
          <Section
            icon={Utensils}
            title="Restaurant"
            subtitle="Wohin nach dem Spiel? · Mehrfachauswahl"
            leader={<Leader winners={restStats.winners} />}
          >
            {restStats.counts.map((o) => (
              <MultiOption
                key={o.id}
                label={o.label}
                sub={o.sub}
                count={o.count}
                max={restStats.max}
                voters={o.voters}
                selected={currentUser !== '' && o.voters.includes(currentUser)}
                currentUser={currentUser}
                onClick={() => toggleMulti('restaurants', o.id)}
              />
            ))}
          </Section>

          {/* ---------- Paintball Paket ---------- */}
          <Section
            icon={Target}
            title="Paintball Paket"
            subtitle="Wähle dein Paket · Einzelauswahl"
            leader={<Leader winners={pkgStats.winners} />}
          >
            {pkgStats.counts.map((o) => (
              <PackageOption
                key={o.id}
                icon={o.icon}
                title={o.title}
                price={o.price}
                count={o.count}
                max={pkgStats.max}
                voters={o.voters}
                selected={currentUser !== '' && state.packages[currentUser] === o.id}
                currentUser={currentUser}
                onClick={() => choosePackage(o.id)}
              />
            ))}
          </Section>

          {/* ---------- Fahrgemeinschaften ---------- */}
          <Section
            icon={Car}
            title="Fahrgemeinschaften"
            subtitle="Tippe auf einen freien Platz"
            leader={
              <div className="ml-0.5 mt-3 flex items-center gap-1.5">
                <Users size={13} strokeWidth={1.5} className="shrink-0 text-[#0071e3]" />
                <span className="text-[11px] font-medium tracking-[0.04em] tabular-nums text-[#86868b]">
                  {seated} von 20 Plätzen belegt
                </span>
              </div>
            }
          >
            <div className="space-y-3">
              {state.cars.map((c) => (
                <CarCard key={c.id} car={c} currentUser={currentUser} onSeat={takeSeat} />
              ))}
            </div>
          </Section>

          {/* ---------- Footer ---------- */}
          <footer className="space-y-3 pt-2 text-center">
            <p className="text-[12px] text-[#86868b]">
              {participants} {participants === 1 ? 'Person ist' : 'Personen sind'} dabei · {seated}/20
              Plätzen belegt
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-[12px] text-[#b0b0b5] transition-colors hover:text-[#86868b]"
            >
              {resetArmed ? 'Wirklich? Nochmal tippen zum Zurücksetzen' : 'Demo-Daten zurücksetzen'}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
