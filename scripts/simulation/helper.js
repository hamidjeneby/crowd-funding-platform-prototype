import fs from "fs";
import path from "path";
import readline from "readline";

/**
 * Loads .env.local if environment variables are not already populated.
 */
export function ensureEnvLoaded() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      if (typeof process.loadEnvFile === "function") {
        try {
          process.loadEnvFile(envPath);
        } catch {}
      } else {
        const lines = fs.readFileSync(envPath, "utf8").split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const idx = trimmed.indexOf("=");
            const k = trimmed.substring(0, idx).trim();
            const v = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
            if (!process.env[k]) {
              process.env[k] = v;
            }
          }
        }
      }
    }
  }
}

// Ensure environment variables from .env.local are loaded immediately upon module import
ensureEnvLoaded();

/**
 * Validates simulation safety guards.
 * Refuses execution unless ALLOW_SIM=true.
 */
export async function guardSimulation(scriptName = "simulation") {
  ensureEnvLoaded();

  if (process.env.ALLOW_SIM !== "true") {
    console.error("\n=======================================================");
    console.error("  [SAFETY GUARD] Simulation Script Blocked");
    console.error("=======================================================");
    console.error(`Script '${scriptName}' refused to run.`);
    console.error("Simulation commands require ALLOW_SIM=true in your environment or command line.");
    console.error("Example: ALLOW_SIM=true node --env-file=.env.local scripts/simulation/...\n");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "Unknown";
  console.log(`[SIMULATION] Target Supabase URL: ${supabaseUrl}`);

  // Parse arguments for --yes or prompt
  const hasYesFlag = process.argv.includes("--yes") || process.argv.includes("-y");
  if (!hasYesFlag && process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question(`Proceed with ${scriptName}? (type 'yes' to confirm): `, resolve);
    });
    rl.close();

    if (String(answer).trim().toLowerCase() !== "yes") {
      console.log("Operation cancelled by user.");
      process.exit(0);
    }
  }
}

/**
 * Extracts numeric project ID from process.argv.
 * Supports: --project=12, -p 12, or positional 12.
 */
export function getProjectIdArg() {
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--project=")) {
      return Number(arg.split("=")[1]);
    }
    if ((arg === "--project" || arg === "-p") && process.argv[i + 1]) {
      return Number(process.argv[i + 1]);
    }
    if (!arg.startsWith("-") && !isNaN(Number(arg))) {
      return Number(arg);
    }
  }
  return null;
}
