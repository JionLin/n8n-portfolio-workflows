import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(new URL("..", import.meta.url).pathname);
const WORKFLOWS_DIR = join(REPO_ROOT, "workflows");
const STICKY_NOTE_TYPE = "n8n-nodes-base.stickyNote";
const SECRET_PATTERNS = [
  { name: "OpenAI-style key", regex: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: "Slack token", regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{30,}/ },
  { name: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "Private key block", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "n8n-data"]);

function listFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      return IGNORED_DIRECTORIES.has(entry) ? [] : listFiles(fullPath);
    }
    return [fullPath];
  });
}

function isWorkflowDefinition(filePath) {
  return filePath.endsWith(".json") && !filePath.split(/[\\/]/).includes("fixtures");
}

function collectWorkflowFiles() {
  return listFiles(WORKFLOWS_DIR).filter(isWorkflowDefinition);
}

function collectTextFilesForSecretScan() {
  return listFiles(REPO_ROOT).filter((filePath) => !filePath.endsWith(".png") && !filePath.endsWith(".gif"));
}

function findConnectionTargets(connections) {
  return Object.entries(connections).flatMap(([sourceName, outputs]) =>
    Object.values(outputs).flatMap((branches) =>
      branches.flatMap((links) => (links ?? []).map((link) => ({ sourceName, targetName: link.node })))
    )
  );
}

function checkWorkflow(filePath) {
  const errors = [];
  const workflow = JSON.parse(readFileSync(filePath, "utf8"));
  const nodes = workflow.nodes ?? [];
  const executableNodes = nodes.filter((node) => node.type !== STICKY_NOTE_TYPE);
  const nodeNames = new Set(executableNodes.map((node) => node.name));

  if (!workflow.name) errors.push("missing workflow name");
  if (nodeNames.size !== executableNodes.length) errors.push("duplicate node names");

  const nodeIds = nodes.map((node) => node.id);
  if (new Set(nodeIds).size !== nodeIds.length) errors.push("duplicate node ids");

  for (const node of executableNodes) {
    if (!node.type?.startsWith("n8n-nodes-base.")) errors.push(`node "${node.name}" has unexpected type ${node.type}`);
    if (typeof node.typeVersion !== "number") errors.push(`node "${node.name}" missing typeVersion`);
  }

  for (const { sourceName, targetName } of findConnectionTargets(workflow.connections ?? {})) {
    if (!nodeNames.has(sourceName)) errors.push(`connection source "${sourceName}" is not a node`);
    if (!nodeNames.has(targetName)) errors.push(`connection target "${targetName}" is not a node`);
  }

  return errors;
}

function checkSecrets(filePath) {
  const content = readFileSync(filePath, "utf8");
  return SECRET_PATTERNS.filter(({ regex }) => regex.test(content)).map(({ name }) => `possible ${name}`);
}

function checkRepoSecrets() {
  return collectTextFilesForSecretScan().flatMap((filePath) =>
    checkSecrets(filePath).map((problem) => `${relative(REPO_ROOT, filePath)}: ${problem}`)
  );
}

function checkRepoHygiene() {
  const errors = [];
  if (existsSync(join(REPO_ROOT, ".env"))) errors.push(".env exists at repo root; keep real values out of the repo");
  const gitignore = existsSync(join(REPO_ROOT, ".gitignore")) ? readFileSync(join(REPO_ROOT, ".gitignore"), "utf8") : "";
  if (!gitignore.split("\n").includes(".env")) errors.push(".gitignore must exclude .env");
  return errors;
}

function main() {
  const workflowFiles = collectWorkflowFiles();
  const failures = [];

  for (const filePath of workflowFiles) {
    const displayPath = relative(REPO_ROOT, filePath);
    try {
      checkWorkflow(filePath).forEach((problem) => failures.push(`${displayPath}: ${problem}`));
    } catch (error) {
      failures.push(`${displayPath}: ${error.message}`);
    }
  }

  checkRepoSecrets().forEach((problem) => failures.push(problem));
  checkRepoHygiene().forEach((problem) => failures.push(`repo: ${problem}`));

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`OK: ${workflowFiles.length} workflow files checked`);
}

main();
