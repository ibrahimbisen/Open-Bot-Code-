import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page } from "playwright-core";
import {
  chatPanels,
  closeBlockingDialogs,
  createChecks,
  createProjectWithAgent,
  dismissToasts,
  leftBar,
  prepareWindow,
  projectButton,
  projectColumn,
  sendInPanel,
  shot,
  until,
  waitForChatsIdle,
} from "./app-e2e-support";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";

const SCREENS = resolve(import.meta.dirname, "../.codebot-build/f3/screens");
const FIRST = "Plan the release notes for Friday";
const SECOND = "Fix the login timeout bug";
const THIRD = "Write tests for the parser";
const RENAMED = "Release plan v2";

let activePage: Page | undefined;
const { checks, step } = createChecks(() => activePage);
const screens: string[] = [];
const observations: string[] = [];

const rows = (page: Page) => projectColumn(page).locator(".project-chat-row");
const rowTitles = async (page: Page) =>
  (await rows(page).locator(".project-chat-title").allTextContents()).map((title) => title.trim());
const searchBox = (page: Page) => projectColumn(page).getByRole("searchbox", { name: "Search chats" });
const searchTitles = async (page: Page) =>
  (await projectColumn(page).locator(".project-search-row .project-chat-title").allTextContents()).map((title) =>
    title.trim(),
  );

async function engineChats(page: Page, projectId: string, archived: "exclude" | "include" | "only") {
  return page.evaluate(
    async (input) =>
      (
        await window.codebot.projects.listChats({ projectId: input.projectId, limit: 50, archived: input.archived })
      ).chats.map((chat) => ({ title: chat.title, archived: chat.archived, taskId: chat.taskId })),
    { projectId, archived },
  );
}

async function openActions(page: Page, title: string): Promise<void> {
  const row = rows(page).filter({ hasText: title }).first();
  await row.hover();
  await projectColumn(page)
    .getByRole("button", { name: `Actions for ${title}`, exact: true })
    .click();
}

async function startChat(page: Page, projectName: string, text: string, count: number): Promise<void> {
  await projectColumn(page).getByRole("button", { name: "New chat", exact: true }).click();
  const panel = chatPanels(page).first();
  await panel.waitFor({ state: "visible", timeout: 60_000 });
  await sendInPanel(page, panel, text);
  await waitForChatsIdle(page, projectName, count);
}

async function main(): Promise<void> {
  const session = await connectChannelE2e("chat-manage-e2e");
  const { page } = session;
  activePage = page;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const restore = await prepareWindow(page);
  const folder = await mkdtemp(join(tmpdir(), "codebot-chat-manage-"));
  mkdirSync(folder, { recursive: true });
  try {
    const projectName = `C${Date.now().toString(36).slice(-4)} Chats`;
    const projectId = await createProjectWithAgent(page, projectName, folder);
    await projectButton(page, projectName).click();
    await projectColumn(page).waitFor({ state: "visible", timeout: 60_000 });

    await step("5.7 the chat title is made from the first message", async () => {
      await startChat(page, projectName, FIRST, 1);
      const titles = await until(
        page,
        "a titled chat row",
        () => rowTitles(page),
        (list) => list.length === 1 && list[0] !== "" && list[0] !== "New chat",
      );
      const title = titles[0] ?? "";
      assert.ok(FIRST.startsWith(title.replace(/…$/u, "")) || title.startsWith(FIRST), `title "${title}"`);
      const engine = await engineChats(page, projectId, "exclude");
      assert.equal(engine[0]?.title, title, "the engine has the same title");
      screens.push(await shot(page, "chat-title-from-first-message-dark", SCREENS));
      return title;
    });

    await startChat(page, projectName, SECOND, 2);
    await startChat(page, projectName, THIRD, 3);
    await until(
      page,
      "three chat rows",
      () => rowTitles(page),
      (list) => [FIRST, SECOND, THIRD].every((text) => list.includes(text)),
    );

    await step("5.7 the user renames a chat from the row menu", async () => {
      await openActions(page, FIRST);
      await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
      const input = projectColumn(page).getByRole("textbox", { name: "Chat title" });
      await input.waitFor({ state: "visible", timeout: 30_000 });
      await input.fill(RENAMED);
      screens.push(await shot(page, "chat-rename-input-dark", SCREENS));
      await input.press("Enter");
      await until(
        page,
        "the renamed row",
        () => rowTitles(page),
        (list) => list.includes(RENAMED) && !list.includes(FIRST),
      );
      screens.push(await shot(page, "chat-renamed-dark", SCREENS));
    });

    await step("5.7 the new title stays after a reload", async () => {
      await page.reload();
      await leftBar(page).waitFor({ state: "visible", timeout: 60_000 });
      await closeBlockingDialogs(page);
      await dismissToasts(page);
      await projectButton(page, projectName).click();
      await until(
        page,
        "the renamed row after the reload",
        () => rowTitles(page),
        (list) => list.includes(RENAMED) && !list.includes(FIRST),
      );
      const engine = await engineChats(page, projectId, "include");
      assert.ok(
        engine.some((chat) => chat.title === RENAMED),
        "the engine keeps the new title",
      );
      screens.push(await shot(page, "chat-renamed-after-reload-dark", SCREENS));
    });

    await step("5.8 search finds a chat by its title and by the new title", async () => {
      await searchBox(page).fill("login");
      const byWord = await until(
        page,
        "the login chat only",
        () => searchTitles(page),
        (list) => list.length >= 1 && list.every((title) => title === SECOND),
      );
      screens.push(await shot(page, "chat-search-dark", SCREENS));
      await searchBox(page).fill("Release plan");
      await until(
        page,
        "the renamed chat",
        () => searchTitles(page),
        (list) => list.length >= 1 && list.every((title) => title === RENAMED),
      );
      await searchBox(page).fill("zzqx-no-such-chat");
      await projectColumn(page)
        .getByText("No chat matches the search", { exact: true })
        .waitFor({ state: "visible", timeout: 30_000 });
      await searchBox(page).fill("");
      await until(
        page,
        "all rows back",
        () => rows(page).count(),
        (count) => count === 3,
      );
      return byWord.join(" | ");
    });

    await step("5.8 an archived chat leaves the list and is found in the archive", async () => {
      await openActions(page, SECOND);
      await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
      await until(
        page,
        "the archived chat leaves the list",
        () => rowTitles(page),
        (list) => list.length === 2 && !list.includes(SECOND),
      );
      await projectColumn(page).getByRole("button", { name: "Show archived chats" }).click();
      await until(
        page,
        "the archived chat in the archive",
        () => rowTitles(page),
        (list) => list.includes(SECOND) && !list.includes(THIRD),
      );
      const archived = await engineChats(page, projectId, "only");
      assert.deepEqual(
        archived.map((chat) => chat.title),
        [SECOND],
        "the engine lists only it as archived",
      );
      screens.push(await shot(page, "chat-archive-list-dark", SCREENS));
      await projectColumn(page).getByRole("button", { name: "Chats", exact: true }).click();
      await until(
        page,
        "the recent list again",
        () => rowTitles(page),
        (list) => list.length === 2 && list.includes(THIRD),
      );
    });

    await step("5.8 a deleted chat is gone from the list, the archive, search and the engine", async () => {
      const before = await engineChats(page, projectId, "include");
      const doomed = before.find((chat) => chat.title === THIRD);
      assert.ok(doomed, "the chat exists before the delete");
      await openActions(page, THIRD);
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
      await dialog.waitFor({ state: "visible", timeout: 30_000 });
      screens.push(await shot(page, "chat-delete-confirm-dark", SCREENS));
      await dialog.getByRole("button", { name: "Delete chat", exact: true }).click();
      await until(
        page,
        "the deleted chat leaves the list",
        () => rowTitles(page),
        (list) => !list.includes(THIRD) && list.includes(RENAMED),
      );
      const after = await engineChats(page, projectId, "include");
      assert.ok(!after.some((chat) => chat.taskId === doomed.taskId), "the engine still lists the chat");
      await searchBox(page).fill("parser");
      await until(
        page,
        "no search result for the deleted chat",
        () => searchTitles(page),
        (list) => !list.includes(THIRD),
        15_000,
      );
      await page.waitForTimeout(1000);
      assert.ok(!(await searchTitles(page)).includes(THIRD), "search still finds the deleted chat");
      await searchBox(page).fill("");
      await page.reload();
      await leftBar(page).waitFor({ state: "visible", timeout: 60_000 });
      await closeBlockingDialogs(page);
      await projectButton(page, projectName).click();
      await until(
        page,
        "the list after a reload",
        () => rowTitles(page),
        (list) => list.includes(RENAMED) && !list.includes(THIRD),
      );
      screens.push(await shot(page, "chat-deleted-dark", SCREENS));
      return `${before.length} chats before, ${after.length} after`;
    });
  } finally {
    await restore();
    await session.close();
    rmSync(folder, { recursive: true, force: true, maxRetries: 3 });
  }
  if (pageErrors.length > 0) observations.push(`page errors: ${pageErrors.join(" | ")}`);
  const passed = checks.length > 0 && checks.every((entry) => entry.passed);
  const reportPath = writeReport("chat-manage", { passed, checks, observations, screens, pageErrors });
  process.stdout.write(`report: ${reportPath}\n`);
  process.exitCode = passed ? 0 : 1;
}

await main();
