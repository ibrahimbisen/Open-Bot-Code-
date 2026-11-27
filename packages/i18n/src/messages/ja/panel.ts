import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/panel";

export const messages = {
  "panel.dock.label": "パネル",
  "panel.add": "パネルを追加",
  "panel.add.otherChat": "別のプロジェクトのチャット",
  "panel.add.file": "ファイル",
  "panel.add.diff": "変更",
  "panel.add.browser": "ブラウザー",
  "panel.add.preview": "プレビュー",
  "panel.split.right": "右に分割",
  "panel.split.down": "下に分割",
  "panel.maximize": "パネルを最大化",
  "panel.restore": "パネルのサイズを元に戻す",
  "panel.close": "パネルを閉じる",
  "panel.pin": "パネルを固定して開いたままにする",
  "panel.unpin": "パネルの固定を解除",
  "panel.preview.loading": "プレビューを読み込んでいます",
  "panel.preview.failed": "プレビューを開けませんでした。",
  "panel.browser.label": "ブラウザーパネル",
  "panel.browser.starting": "ブラウザーを開いています",
  "panel.browser.failed": "ブラウザーページを開けませんでした。",
  "panel.browser.closed": "このブラウザーページは閉じられました。",
  "panel.browser.takeControl": "ページの操作を引き継ぐ",
  "panel.browser.handControl": "エージェントに操作を渡す",
  "panel.browser.userControls": "あなたがこのページを操作しています",
  "panel.browser.agentControls": "エージェントがこのページを操作しています",
  "panel.header.model": "このチャットのモデル",
  "panel.header.modelLocked": "今はモデルを変更できません。",
  "panel.header.files": "プロジェクトのファイル",
  "panel.draft.agent": "エージェント",
  "panel.chat.noAgent":
    "このプロジェクトにはエージェントがありません。プロジェクト設定でエージェントを追加してください。",
  "panel.picker.title": "パネルでチャットを開く",
  "panel.picker.description":
    "プロジェクトを選び、次にチャットを選んでください。パネルにはプロジェクト名が表示されます。",
  "panel.picker.project": "プロジェクト",
} as const satisfies PartialTranslation<typeof source>;
