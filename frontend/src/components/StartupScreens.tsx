import type { EnvProblem } from "../config/env";

/** Shown instead of the app when configuration is broken, naming exactly what to fix. */
export function StartupError({ problems }: { problems: EnvProblem[] }) {
  return (
    <main className="wrap py-10" data-testid="startup-error">
      <h1 className="display text-3xl">Configuration problem</h1>
      <p className="mt-2">The app can't start until these environment variables are fixed (in <code>frontend/.env</code> or your host's settings):</p>
      <ul className="mt-3 list-disc pl-6">
        {problems.map((p) => (
          <li key={p.name}>
            <code>{p.name}</code> {p.problem}
          </li>
        ))}
      </ul>
    </main>
  );
}

export function NotDeployed({ chainName, chainId }: { chainName: string; chainId: number }) {
  return (
    <main className="wrap py-10" data-testid="not-deployed">
      <h1 className="display text-3xl">No contract on {chainName}</h1>
      <p className="mt-2">
        There is no VotingDApp deployment for chain {chainId} in <code>frontend/src/contract/deployments.json</code>. Run the
        deploy script for this network (see README), then reload.
      </p>
    </main>
  );
}
