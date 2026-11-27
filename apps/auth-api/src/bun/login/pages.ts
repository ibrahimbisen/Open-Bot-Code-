const TEXT = {
  product: "CodeBot",
  deviceTitle: "Connect a device",
  deviceIntro: "Enter the code that the device shows. Then sign in with {provider}.",
  codeLabel: "Code",
  continue: "Continue",
  codeInvalid: "This code is not valid. Check the code and try again.",
  tooManyAttempts: "Too many attempts. Try again later.",
  approveTitle: "Allow this device?",
  approveIntro: "A device asks for access to your CodeBot account.",
  approveAccount: "Account",
  approveDevice: "Device",
  approveCode: "Code on the device",
  approveWarning: "Allow it only if you started this sign-in and the code is the same as the code on the device.",
  allow: "Allow",
  refuse: "Refuse",
  approvedTitle: "The device is connected",
  approvedBody: "You can close this page.",
  deniedTitle: "The sign-in was refused",
  deniedBody: "The device gets no access. You can close this page.",
  failedTitle: "The sign-in did not finish",
  failedNext: "Start the sign-in again in CodeBot.",
} as const;

const FAILURE_TEXT: Readonly<Record<string, string>> = {
  login_expired: "This sign-in is not valid any more.",
  provider_refused: "{provider} did not allow the sign-in.",
  provider_unreachable: "{provider} does not answer.",
  provider_rejected: "{provider} refused the request of the account service.",
  token_invalid: "The answer of {provider} cannot be checked.",
  identity_missing: "{provider} gave no user.",
  refresh_token_missing: "{provider} gave no refresh token. Tell the administrator of the account service.",
  account_disabled: "This account is disabled.",
  login_failed: "The account service could not complete the sign-in.",
};

const STYLE = `
:root{color-scheme:light dark}
body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:Canvas;color:CanvasText}
main{max-width:26rem;margin:12vh auto 0;padding:0 1.25rem}
h1{font-size:1.35rem;margin:0 0 .75rem}
p{margin:0 0 1rem}
label{display:block;font-weight:600;margin-bottom:.35rem}
input[type=text]{box-sizing:border-box;width:100%;font:inherit;font-size:1.4rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem .7rem;border:1px solid GrayText;border-radius:.4rem;background:Field;color:FieldText}
button{font:inherit;padding:.6rem 1.1rem;border-radius:.4rem;border:1px solid GrayText;background:ButtonFace;color:ButtonText;cursor:pointer}
button.primary{background:#1f5fbf;border-color:#1f5fbf;color:#fff}
.actions{display:flex;gap:.6rem;margin-top:1.1rem}
.error{border-left:.25rem solid #c0392b;padding:.5rem .75rem;margin-bottom:1rem}
dl{margin:0 0 1rem;display:grid;grid-template-columns:auto 1fr;gap:.3rem 1rem}
dt{font-weight:600}
dd{margin:0;overflow-wrap:anywhere}
.code{font-family:ui-monospace,Consolas,monospace;font-size:1.2rem;letter-spacing:.1em}
.brand{color:GrayText;font-size:.85rem;margin-top:2.5rem}
`;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function withProvider(text: string, providerName: string): string {
  return escapeHtml(text.replaceAll("{provider}", providerName));
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} - ${TEXT.product}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
<p class="brand">${TEXT.product}</p>
</main>
</body>
</html>
`;
}

export function htmlResponse(html: string, status: number, formOrigins: readonly string[] = []): Response {
  const formAction = ["'self'", ...formOrigins].join(" ");
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; form-action ${formAction}; base-uri 'none'; frame-ancestors 'none'`,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  });
}

export function deviceCodePage(input: {
  providerName: string;
  code: string;
  problem: "invalid" | "rate_limited" | null;
}): string {
  const problem =
    input.problem === null
      ? ""
      : `<p class="error" role="alert">${escapeHtml(input.problem === "invalid" ? TEXT.codeInvalid : TEXT.tooManyAttempts)}</p>`;
  return page(
    TEXT.deviceTitle,
    `<h1>${TEXT.deviceTitle}</h1>
<p>${withProvider(TEXT.deviceIntro, input.providerName)}</p>
${problem}<form method="post" action="/device">
<label for="code">${TEXT.codeLabel}</label>
<input type="text" id="code" name="code" value="${escapeHtml(input.code)}" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" required autofocus>
<div class="actions"><button class="primary" type="submit">${TEXT.continue}</button></div>
</form>`,
  );
}

export function deviceApprovalPage(input: {
  approval: string;
  userCode: string;
  userName: string;
  deviceName: string | null;
}): string {
  const device = input.deviceName ? `<dt>${TEXT.approveDevice}</dt><dd>${escapeHtml(input.deviceName)}</dd>` : "";
  return page(
    TEXT.approveTitle,
    `<h1>${TEXT.approveTitle}</h1>
<p>${TEXT.approveIntro}</p>
<dl>
<dt>${TEXT.approveAccount}</dt><dd>${escapeHtml(input.userName)}</dd>
${device}
<dt>${TEXT.approveCode}</dt><dd class="code">${escapeHtml(input.userCode)}</dd>
</dl>
<p>${TEXT.approveWarning}</p>
<form method="post" action="/device/decision">
<input type="hidden" name="approval" value="${escapeHtml(input.approval)}">
<div class="actions">
<button class="primary" type="submit" name="decision" value="allow">${TEXT.allow}</button>
<button type="submit" name="decision" value="refuse">${TEXT.refuse}</button>
</div>
</form>`,
  );
}

export function deviceDecisionPage(decision: "approved" | "denied"): string {
  const title = decision === "approved" ? TEXT.approvedTitle : TEXT.deniedTitle;
  const body = decision === "approved" ? TEXT.approvedBody : TEXT.deniedBody;
  return page(title, `<h1>${title}</h1>\n<p>${body}</p>`);
}

export function loginFailedPage(input: { providerName: string; code: string }): string {
  const reason = FAILURE_TEXT[input.code] ?? FAILURE_TEXT.login_failed ?? "";
  return page(
    TEXT.failedTitle,
    `<h1>${TEXT.failedTitle}</h1>
<p>${withProvider(reason, input.providerName)}</p>
<p>${TEXT.failedNext}</p>`,
  );
}
