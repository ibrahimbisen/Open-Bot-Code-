import type { AgentProjectContext } from "./project-context";

function tagSafe(text: string): string {
  return text.replace(/<\/?\s*project_(?:instructions|reply_rule)\b/gi, "[$&]");
}

export function projectWorkingDirectoryText(project: AgentProjectContext, ownFolder: string): string {
  return `You work in the project ${JSON.stringify(project.projectName)}. Your working directory is ${project.mainFolder}, the main folder of the project. Your own folder for notes that are not part of the project is ${ownFolder}.`;
}

export function projectInstructionLines(project: AgentProjectContext): string[] {
  const lines = [
    `The project has these folders: ${project.folders.join(", ")}. Stay inside them. Do not search other folders of the computer for files unless the user asks.`,
  ];
  if (project.replyRule)
    lines.push(
      `Reply rule of the project:\n<project_reply_rule>\n${tagSafe(project.replyRule)}\n</project_reply_rule>`,
    );
  if (project.instructions.trim())
    lines.push(
      `Instructions of the project, from the user:\n<project_instructions>\n${tagSafe(project.instructions.trim())}\n</project_instructions>`,
    );
  return lines;
}
