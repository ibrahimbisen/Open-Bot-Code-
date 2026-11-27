import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page } from "playwright-core";
import {
  chatPanels,
  createChecks,
  createProjectWithAgent,
  prepareWindow,
  projectButton,
  sendInPanel,
  shot,
  until,
  waitForChatsIdle,
} from "./app-e2e-support";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";

const ROOT = resolve(import.meta.dirname, "..");
let activePage: Page | undefined;
const { checks, step } = createChecks(() => activePage);
const screens: string[] = [];

function pdfDocument(text: string): string {
  const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return body;
}

function git(folder: string, ...args: string[]): void {
  execFileSync("git", args, { cwd: folder, stdio: "ignore" });
}

async function makeRepository(): Promise<string> {
  const folder = await realpath(await mkdtemp(join(tmpdir(), "codebot-explorer-screen-")));
  git(folder, "init", "-q");
  git(folder, "config", "user.email", "e2e@codebot.local");
  git(folder, "config", "user.name", "E2E");
  git(folder, "config", "commit.gpgsign", "false");
  writeFileSync(join(folder, ".gitignore"), "ignored.log\n");
  writeFileSync(join(folder, "tracked.txt"), "first line\n");
  writeFileSync(join(folder, "removed.txt"), "this file goes away\n");
  writeFileSync(join(folder, "agent-notes.md"), "# Notes\n");
  writeFileSync(
    join(folder, "data.json"),
    JSON.stringify({ name: "CodeBot", panels: ["chat", "file", "diff"], count: 3 }),
  );
  writeFileSync(join(folder, "table.csv"), "name,role,chats\nAda,Developer,4\nGrace,Reviewer,2\nLinus,Tester,7\n");
  writeFileSync(
    join(folder, "logo.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><rect width="160" height="80" rx="12" fill="#84aadd"/><circle cx="52" cy="40" r="12" fill="#1b1b1f"/><circle cx="108" cy="40" r="12" fill="#1b1b1f"/></svg>\n',
  );
  writeFileSync(join(folder, "guide.pdf"), pdfDocument("CodeBot PDF preview"));
  copyFileSync(join(ROOT, "build", "icon-dev.png"), join(folder, "picture.png"));
  git(folder, "add", "-A");
  git(folder, "commit", "-q", "-m", "start");
  writeFileSync(join(folder, "tracked.txt"), "first line\nsecond line\n");
  unlinkSync(join(folder, "removed.txt"));
  writeFileSync(join(folder, "untracked.txt"), "new file\n");
  writeFileSync(join(folder, "ignored.log"), "log line\n");
  return folder;
}

const tree = (page: Page) => page.getByRole("tree", { name: "File tree" }).first();
const row = (page: Page, name: string) =>
  tree(page)
    .getByRole("treeitem", { name: new RegExp(`^${name}`) })
    .first();
const gitList = (page: Page) => page.getByRole("list", { name: "Changed files" }).first();

async function openTool(page: Page, name: "Files" | "Git"): Promise<void> {
  await page.getByRole("tablist", { name: "Project tools" }).getByRole("tab", { name }).click();
}

async function openPreview(page: Page, name: string) {
  await row(page, name).click();
  const host = page
    .locator(".dv-groupview")
    .filter({ has: page.locator(".dv-tab", { hasText: name }) })
    .first();
  await host.waitFor({ state: "visible", timeout: 30_000 });
  return host;
}

async function main(): Promise<void> {
  const session = await connectChannelE2e("explorer-screen-e2e");
  const { page } = session;
  activePage = page;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const restore = await prepareWindow(page);
  const folder = await makeRepository();
  try {
    const projectName = `E${Date.now().toString(36).slice(-4)} Files`;
    await createProjectWithAgent(page, projectName, folder);
    await projectButton(page, projectName).click();
    await chatPanels(page).first().waitFor({ state: "visible", timeout: 60_000 });
    await openTool(page, "Files");
    await tree(page).waitFor({ state: "visible", timeout: 30_000 });

    await step("7.3 the tree marks changed, new and ignored files with their git state", async () => {
      await row(page, "tracked.txt").getByTitle("Modified").waitFor({ state: "visible", timeout: 30_000 });
      await row(page, "untracked.txt").getByTitle("Untracked").waitFor({ state: "visible", timeout: 30_000 });
      const ignored = await row(page, "ignored.log").evaluate((element) => getComputedStyle(element).opacity);
      const plain = await row(page, "data.json").evaluate((element) => getComputedStyle(element).opacity);
      assert.ok(Number(ignored) < Number(plain), `ignored opacity ${ignored}, plain ${plain}`);
      assert.equal(
        await row(page, "data.json")
          .getByTitle(/Modified|Untracked|Added|Deleted/)
          .count(),
        0,
      );
      await openTool(page, "Git");
      await gitList(page).waitFor({ state: "visible", timeout: 30_000 });
      await gitList(page)
        .getByRole("button", { name: /removed\.txt/ })
        .getByTitle("Deleted")
        .waitFor({ timeout: 30_000 });
      screens.push(await shot(page, "explorer-git-changes-dark"));
      await openTool(page, "Files");
      await tree(page).waitFor({ state: "visible", timeout: 30_000 });
      screens.push(await shot(page, "explorer-tree-git-marks-dark"));
      return `ignored opacity ${ignored}`;
    });

    await step("7.8 the tree shows a file that appears on disk and drops it when it goes away", async () => {
      writeFileSync(join(folder, "live-added.txt"), "added while the app runs\n");
      await row(page, "live-added.txt").waitFor({ state: "visible", timeout: 30_000 });
      screens.push(await shot(page, "explorer-tree-live-added-dark"));
      rmSync(join(folder, "live-added.txt"));
      await row(page, "live-added.txt").waitFor({ state: "detached", timeout: 30_000 });
    });

    await step("7.6 image preview", async () => {
      const host = await openPreview(page, "picture.png");
      const image = host.getByRole("img", { name: "picture.png" });
      await image.waitFor({ state: "visible", timeout: 30_000 });
      const width = await image.evaluate((element) => (element instanceof HTMLImageElement ? element.naturalWidth : 0));
      assert.ok(width > 0, "the image did not load");
      screens.push(await shot(page, "explorer-preview-image-dark"));
      return `${width} px wide`;
    });

    await step("7.6 SVG preview", async () => {
      const host = await openPreview(page, "logo.svg");
      const image = host.getByRole("img", { name: "logo.svg" });
      await image.waitFor({ state: "visible", timeout: 30_000 });
      const width = await image.evaluate((element) => (element instanceof HTMLImageElement ? element.naturalWidth : 0));
      assert.ok(width > 0, "the SVG did not load");
      screens.push(await shot(page, "explorer-preview-svg-dark"));
    });

    await step("7.6 PDF preview", async () => {
      const host = await openPreview(page, "guide.pdf");
      const frame = host.locator('iframe[title="guide.pdf"]');
      await frame.waitFor({ state: "visible", timeout: 30_000 });
      const box = await frame.boundingBox();
      assert.ok(box && box.height > 200, "the PDF frame is too small");
      await page.waitForTimeout(1500);
      screens.push(await shot(page, "explorer-preview-pdf-dark"));
    });

    await step("7.6 JSON preview shows the structure", async () => {
      const host = await openPreview(page, "data.json");
      const structure = host.getByRole("list", { name: "JSON structure" });
      await structure.waitFor({ state: "visible", timeout: 30_000 });
      await structure.getByText("CodeBot").first().waitFor({ state: "visible", timeout: 30_000 });
      screens.push(await shot(page, "explorer-preview-json-dark"));
    });

    await step("7.6 CSV preview shows a table", async () => {
      const host = await openPreview(page, "table.csv");
      const table = host.getByRole("table");
      await table.waitFor({ state: "visible", timeout: 30_000 });
      await table.getByRole("cell", { name: "Grace" }).waitFor({ state: "visible", timeout: 30_000 });
      await host.getByText("3 rows, 3 columns.").waitFor({ state: "visible", timeout: 30_000 });
      screens.push(await shot(page, "explorer-preview-csv-dark"));
    });

    await step("7.7 a file that the agent changed in the chat opens in a diff view", async () => {
      await page.locator(".dv-tab", { hasText: "New chat" }).first().click();
      await chatPanels(page).first().waitFor({ state: "visible", timeout: 30_000 });
      await sendInPanel(page, chatPanels(page).first(), "Update the notes [edit]");
      await waitForChatsIdle(page, projectName, 1);
      await openTool(page, "Git");
      const change = gitList(page).getByRole("button", { name: /agent-notes\.md/ });
      await change.waitFor({ state: "visible", timeout: 30_000 });
      await change.click();
      const diff = page
        .locator(".dv-groupview")
        .filter({ has: page.locator(".dv-tab", { hasText: "agent-notes.md" }) });
      await diff.first().waitFor({ state: "visible", timeout: 30_000 });
      await until(
        page,
        "the diff shows the agent line",
        () => diff.first().innerText(),
        (text) => text.replace(/\s+/g, " ").includes("Line written by the agent"),
      );
      await page.waitForTimeout(800);
      screens.push(await shot(page, "explorer-diff-agent-change-dark"));
    });
  } finally {
    await restore();
    await session.close();
    rmSync(folder, { recursive: true, force: true, maxRetries: 3 });
  }
  const passed = checks.length > 0 && checks.every((entry) => entry.passed);
  const reportPath = writeReport("explorer-screen", { passed, checks, screens, pageErrors });
  process.stdout.write(`report: ${reportPath}\n`);
  process.exitCode = passed ? 0 : 1;
}

await main();
