import { useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { parseEventLogs } from "viem";
import { OnChainSteps, PollPreview } from "../components/PollPreview";
import { TxStatus } from "../components/TxStatus";
import { votingAbi } from "../contract/contract";
import { useAccount } from "wagmi";
import { useChainClock } from "../hooks/useChainClock";
import { useCreateFeeEstimate } from "../hooks/useFeeEstimate";
import { useTx } from "../hooks/useTx";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useWriteGate } from "../hooks/useWriteGate";
import { byteLength } from "../lib/bytes";
import { formatDateTime } from "../lib/format";
import {
  DEADLINE_SAFETY_SEC,
  MAX_DESCRIPTION_BYTES,
  MAX_DURATION_SEC,
  MAX_OPTION_BYTES,
  MAX_OPTIONS,
  MAX_TITLE_BYTES,
  MIN_DURATION_SEC,
  MIN_OPTIONS,
} from "../lib/limits";
import { checkDraft } from "../lib/validation";

// <input type="datetime-local"> works in local wall-clock text; these convert to/from epoch.
function toLocalInput(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(value: string): number | null {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

const PRESETS = [
  { label: "1 hour", sec: 3600 },
  { label: "1 day", sec: 86400 },
  { label: "7 days", sec: 7 * 86400 },
];

type Row = { key: number; value: string };

function Counter({ used, max }: { used: number; max: number }) {
  return (
    <span className={`counter ${used > max ? "counter-over" : ""}`} aria-live="off">
      {used}/{max} bytes
    </span>
  );
}

export function CreatePoll() {
  const navigate = useNavigate();
  const { nowSec } = useChainClock();
  const gate = useWriteGate();
  const { address } = useAccount();
  const uid = useId();
  const nextKey = useRef(2);
  const reduceMotion = useReducedMotion();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Stable keys so React doesn't mix up inputs when a middle row is removed.
  const [rows, setRows] = useState<Row[]>([
    { key: 0, value: "" },
    { key: 1, value: "" },
  ]);
  const [deadline, setDeadline] = useState(() => toLocalInput(nowSec + 86400));
  const [attempted, setAttempted] = useState(false);
  const [step, setStep] = useState<"edit" | "review">("edit");

  const check = checkDraft(
    { title, description, options: rows.map((r) => r.value), endTimeSec: fromLocalInput(deadline) },
    nowSec,
  );
  const show = (msg: string | undefined) => (attempted ? msg : undefined);
  const endSec = fromLocalInput(deadline);
  const fee = useCreateFeeEstimate(
    step === "review" && check.valid && endSec !== null
      ? [check.clean.title, check.clean.description, check.clean.options, BigInt(endSec)]
      : null,
  );

  const tx = useTx({
    action: "create",
    noun: "Poll",
    pendingMessage: "Creating your poll — waiting for the network to confirm it.",
    confirmedMessage: "Poll created.",
    onConfirmed: (receipt) => {
      // The new id comes from the PollCreated event, never from a guess like pollCount + 1.
      const [created] = parseEventLogs({ abi: votingAbi, logs: receipt.logs, eventName: "PollCreated" });
      if (!created) return;
      // Let the "recorded" seal play for a moment, then land on the live poll with its block + tx.
      const state = { created: { block: receipt.blockNumber.toString(), hash: receipt.transactionHash } };
      setTimeout(() => navigate(`/poll/${created.args.pollId}`, { state }), reduceMotion ? 300 : 1400);
    },
  });

  function goReview(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (check.valid) setStep("review");
  }

  function submit() {
    const { title: t, description: d, options } = check.clean;
    void tx.run({ functionName: "createPoll", args: [t, d, options, BigInt(fromLocalInput(deadline)!)] });
  }

  const minInput = toLocalInput(nowSec + MIN_DURATION_SEC + DEADLINE_SAFETY_SEC + 60);
  const maxInput = toLocalInput(nowSec + MAX_DURATION_SEC - DEADLINE_SAFETY_SEC);

  if (step === "review") {
    return (
      <section aria-labelledby="review-heading" className="mx-auto max-w-2xl">
        <h1 id="review-heading" className="display text-3xl">
          Review your poll
        </h1>
        <div className="card mt-4" data-testid="review">
          <p className="display text-xl break-words">{check.clean.title}</p>
          {check.clean.description && <p className="mt-2 whitespace-pre-wrap break-words">{check.clean.description}</p>}
          <ol className="mt-3 list-decimal pl-6">
            {check.clean.options.map((o, i) => (
              <li key={i} className="break-words">
                {o}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm">Voting closes {formatDateTime(fromLocalInput(deadline)!)}</p>
        </div>
        <p className="fee-line mt-4" data-testid="fee-estimate">
          <span className="muted">Network fee</span>{" "}
          {!address ? (
            <span>shown once your wallet is connected</span>
          ) : fee.isPending ? (
            <span className="muted">estimating…</span>
          ) : fee.data ? (
            <span className="mono">
              ≈ {Number(fee.data.eth).toPrecision(3)} ETH <span className="muted">({fee.data.gas.toLocaleString()} gas · test ETH, free)</span>
            </span>
          ) : (
            <span className="muted">couldn't estimate right now</span>
          )}
        </p>
        <p className="notice mt-4" role="note">
          <strong>This is permanent and can't be edited.</strong> Once created, the poll lives on the blockchain. You can cancel it
          only while it has no votes.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setStep("edit")} disabled={tx.busy}>
            Back to edit
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!gate.ok || tx.busy}>
            {tx.busy ? "Working…" : "Sign and create poll"}
          </button>
        </div>
        {!gate.ok && <p className="hint mt-2" data-testid="write-disabled">{gate.reason}</p>}
        <div className="mt-3">
          <TxStatus state={tx.state} pendingLabel="Creating your poll…" />
        </div>
      </section>
    );
  }

  return (
    <div className="create-layout">
      <section aria-labelledby="create-heading" className="min-w-0">
        <h1 id="create-heading" className="display text-3xl">
          Create a poll
        </h1>
        <p className="muted mt-1 text-sm">Limits are in bytes, like the contract: some letters (Tamil, emoji…) use 3–4 bytes each.</p>

        <form onSubmit={goReview} noValidate className="mt-5 space-y-5">
          <div className="field">
            <div className="field-head">
              <label htmlFor={`${uid}-title`}>Question</label>
              <Counter used={byteLength(title.trim())} max={MAX_TITLE_BYTES} />
            </div>
            <input
              id={`${uid}-title`}
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={Boolean(show(check.errors.title))}
              aria-describedby={`${uid}-title-err`}
            />
            <p id={`${uid}-title-err`} className="field-error">
              {show(check.errors.title)}
            </p>
          </div>

          <div className="field">
            <div className="field-head">
              <label htmlFor={`${uid}-desc`}>Description (optional)</label>
              <Counter used={byteLength(description.trim())} max={MAX_DESCRIPTION_BYTES} />
            </div>
            <textarea
              id={`${uid}-desc`}
              className="input min-h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={Boolean(check.errors.description)}
              aria-describedby={`${uid}-desc-err`}
            />
            <p id={`${uid}-desc-err`} className="field-error">
              {check.errors.description}
            </p>
          </div>

          <fieldset className="field">
            <legend>
              Options ({MIN_OPTIONS}–{MAX_OPTIONS})
            </legend>
            <ol className="space-y-2">
              {rows.map((row, i) => {
                const err = show(check.errors.options[i]) ?? (byteLength(row.value.trim()) > MAX_OPTION_BYTES ? check.errors.options[i] : undefined);
                const warn = check.warnings[i];
                return (
                  <li key={row.key}>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`${uid}-opt-${row.key}`} className="sr-only">
                        Option {i + 1}
                      </label>
                      <input
                        id={`${uid}-opt-${row.key}`}
                        className="input flex-1"
                        placeholder={`Option ${i + 1}`}
                        value={row.value}
                        onChange={(e) => setRows(rows.map((r) => (r.key === row.key ? { ...r, value: e.target.value } : r)))}
                        aria-invalid={Boolean(err)}
                        aria-describedby={`${uid}-opt-${row.key}-msg`}
                      />
                      <Counter used={byteLength(row.value.trim())} max={MAX_OPTION_BYTES} />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                        disabled={rows.length <= MIN_OPTIONS}
                        aria-label={`Remove option ${i + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                    <p id={`${uid}-opt-${row.key}-msg`} className={err ? "field-error" : "field-warning"} data-testid={`option-msg-${i}`}>
                      {err ?? warn}
                    </p>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              className="btn btn-secondary mt-2"
              onClick={() => setRows([...rows, { key: nextKey.current++, value: "" }])}
              disabled={rows.length >= MAX_OPTIONS}
            >
              Add option
            </button>
            {rows.length >= MAX_OPTIONS && <p className="hint mt-1">That's the maximum of {MAX_OPTIONS} options.</p>}
          </fieldset>

          <div className="field">
            <label htmlFor={`${uid}-deadline`}>Voting closes</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={`${uid}-deadline`}
                type="datetime-local"
                className="input"
                value={deadline}
                min={minInput}
                max={maxInput}
                onChange={(e) => setDeadline(e.target.value)}
                aria-invalid={Boolean(show(check.errors.endTime))}
                aria-describedby={`${uid}-deadline-err`}
              />
              {PRESETS.map((p) => (
                <button key={p.label} type="button" className="btn btn-ghost" onClick={() => setDeadline(toLocalInput(nowSec + p.sec))}>
                  {p.label}
                </button>
              ))}
            </div>
            <p className="hint mt-1">
              {fromLocalInput(deadline) !== null && `Closes ${formatDateTime(fromLocalInput(deadline)!)}. `}
              Between 6 minutes and 30 days from now.
            </p>
            <p id={`${uid}-deadline-err`} className="field-error">
              {show(check.errors.endTime)}
            </p>
          </div>

          <button type="submit" className="btn btn-primary">
            Review
          </button>
          {attempted && !check.valid && (
            <p role="alert" className="field-error">
              Fix the highlighted fields to continue.
            </p>
          )}
        </form>
      </section>
      <aside className="create-aside" aria-label="Preview">
        <p className="aside-kicker mono">Live preview</p>
        <PollPreview
          title={title}
          options={rows.map((r) => r.value)}
          creator={address}
          secondsLeft={endSec === null ? null : endSec - nowSec}
        />
        <p className="aside-kicker mono mt-8">What happens on-chain</p>
        <OnChainSteps />
      </aside>
    </div>
  );
}
