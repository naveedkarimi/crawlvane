import { Pill } from "./ui";

export interface SimpleCheck { status: "pass" | "warn" | "fail" | "info"; title: string; detail: string; fix?: string }

/** Pass/warn/fail rows used by the free tools. Fixes show only for checks that don't pass. */
export default function CheckList({ checks }: { checks: SimpleCheck[] }) {
  return (
    <ul className="plain">
      {checks.map((c, i) => (
        <li key={i} className={`check ${c.status}`}>
          <Pill status={c.status} />
          <div>
            <div className="check-title">{c.title}</div>
            <div className="check-detail">{c.detail}</div>
            {c.fix && c.status !== "pass" && c.status !== "info" && <div className="check-fix">→ {c.fix}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
