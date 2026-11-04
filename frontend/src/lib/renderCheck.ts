import type { Lab, LabCheckResult } from "./curriculum";

const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

function withCsp(html: string) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
  if (/<head(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${meta}`);
  }
  if (/<html(\s[^>]*)?>/i.test(html)) {
    return html.replace(
      /<html(\s[^>]*)?>/i,
      (match) => `${match}<head>${meta}</head>`,
    );
  }
  return `<!doctype html><html><head>${meta}</head><body>${html}</body></html>`;
}

export function buildRenderDocument(
  languageId: string,
  lab: Lab,
  code: string,
) {
  if (languageId === "css") {
    return withCsp(
      `<!doctype html><html><head><style>${code}</style></head><body>${lab.fixture ?? ""}</body></html>`,
    );
  }
  return withCsp(code);
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function waitForFrame(frame: HTMLIFrameElement, documentHtml: string) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    frame.addEventListener("load", done, { once: true });
    frame.srcdoc = documentHtml;
    setTimeout(done, 4000);
  });
}

export async function runRenderChecks(
  languageId: string,
  lab: Lab,
  code: string,
): Promise<LabCheckResult[]> {
  const checks = lab.renderChecks ?? [];
  if (!checks.length) return [];
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.setAttribute("title", "Lab preview");
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1200px;height:900px;border:0;";
  document.body.append(frame);
  try {
    await waitForFrame(frame, buildRenderDocument(languageId, lab, code));
    const doc = frame.contentDocument;
    const view = frame.contentWindow;
    if (!doc || !view) {
      return checks.map((check) => ({
        label: check.label,
        pass: false,
        detail: "The preview could not be rendered.",
      }));
    }
    return checks.map((check) => {
      if (check.viewport) {
        frame.style.width = `${check.viewport}px`;
        void frame.offsetWidth;
      }
      const nodes = [...doc.querySelectorAll(check.selector)];
      if (check.count !== undefined && nodes.length !== check.count) {
        return {
          label: check.label,
          pass: false,
          detail: `Found ${nodes.length} element(s) matching ${check.selector}, expected ${check.count}.`,
        };
      }
      if (nodes.length === 0) {
        return {
          label: check.label,
          pass: false,
          detail: `No element matched ${check.selector}.`,
        };
      }
      if (
        check.text !== undefined &&
        !nodes.some(
          (node) =>
            normalizeText(node.textContent) === normalizeText(check.text),
        )
      ) {
        return {
          label: check.label,
          pass: false,
          detail: `The text of ${check.selector} does not match "${check.text}".`,
        };
      }
      if (check.attribute !== undefined) {
        const matches = nodes.some((node) => {
          const value = node.getAttribute(check.attribute!);
          return check.value === undefined
            ? value !== null
            : value === check.value;
        });
        if (!matches) {
          return {
            label: check.label,
            pass: false,
            detail: `The ${check.attribute} attribute on ${check.selector} is missing or wrong.`,
          };
        }
      }
      if (check.style) {
        const actual = nodes
          .map((node) =>
            view
              .getComputedStyle(node)
              .getPropertyValue(check.style!.property)
              .trim(),
          )
          .find((value) => value !== check.style!.value);
        if (actual !== undefined) {
          return {
            label: check.label,
            pass: false,
            detail: `${check.style.property} is "${actual}", expected "${check.style.value}".`,
          };
        }
      }
      return { label: check.label, pass: true };
    });
  } finally {
    frame.remove();
  }
}
