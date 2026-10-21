import { useMemo, useState } from "react";
import { marked } from "marked";

const docs = import.meta.glob("../../docs/*.{md,sql}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const contracts = import.meta.glob("../../contracts/*.{sol,md}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const base = (p: string) => p.split("/").pop()!;
const ext = (p: string) => p.split(".").pop()!;

function render(path: string, src: string) {
  if (ext(path) === "md") return marked.parse(src, { async: false }) as string;
  const lang = ext(path) === "sol" ? "solidity" : "sql";
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<h1>${base(path)}</h1><pre><code class="language-${lang}">${esc}</code></pre>`;
}

export function Specs() {
  const groups = useMemo(() => [
    { title: "Architecture specifications", files: Object.keys(docs).sort() },
    { title: "Solidity interfaces", files: Object.keys(contracts).sort() },
  ], []);
  const all = { ...docs, ...contracts };
  const [sel, setSel] = useState(groups[0].files.find((f) => base(f) === "README.md") ?? groups[0].files[0] ?? "");
  const html = useMemo(() => (sel ? render(sel, all[sel]) : ""), [sel]);

  return (
    <div className="docs">
      <aside className="panel doclist rise">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="kicker grp">{g.title}</div>
            {g.files.length === 0 && <div className="muted" style={{ padding: "6px 12px" }}>None yet</div>}
            {g.files.map((f) => <button key={f} className={sel === f ? "on" : ""} onClick={() => setSel(f)}>{base(f)}</button>)}
          </div>
        ))}
      </aside>
      <article className="panel rise" style={{ animationDelay: "60ms" }}>
        {sel ? <div className="md" dangerouslySetInnerHTML={{ __html: html }} /> : <div className="empty"><span className="serif">No documents</span></div>}
      </article>
    </div>
  );
}
