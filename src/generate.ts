#!/usr/bin/env bun
// @ts-nocheck
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

const TEMPLATE_PLACEHOLDER = "{{MODEL_LINKS}}";

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function toDisplayName(slug: string): string {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/[&"'<>]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      default:
        return char;
    }
  });
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const templatePath = join(rootDir, "src", "index.template.html");
  const outputsDir = join(rootDir, "outputs");
  const distDir = join(rootDir, "dist");
  const distIndexPath = join(distDir, "index.html");

  const template = await readFile(templatePath, "utf8");

  let entries;
  try {
    entries = await readdir(outputsDir, { withFileTypes: true });
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      await mkdir(distDir, { recursive: true });
      await writeFile(
        distIndexPath,
        template.replace(
          TEMPLATE_PLACEHOLDER,
          "            <div class=\"no-models\">未找到任何模型输出</div>"
        ),
        "utf8"
      );
      console.warn("未找到 outputs 目录，已生成占位索引页。");
      return;
    }
    throw error;
  }

  const modelLinks: string[] = [];

  await mkdir(distDir, { recursive: true });

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) {
      continue;
    }

    const slug = entry.name;
    const modelRoot = join(outputsDir, slug);
    const modelDistDir = join(modelRoot, "dist");
    const distIndexPath = join(modelDistDir, "index.html");

    if (!(await pathExists(distIndexPath))) {
      try {
        await mkdir(modelDistDir, { recursive: true });
        await runBuild(modelRoot);
      } catch (error) {
        console.error(`构建 ${slug} 失败:`, error);
        continue;
      }

      if (!(await pathExists(distIndexPath))) {
        console.warn(`跳过 ${slug}: 构建未生成 dist/index.html`);
        continue;
      }
    }

    const targetDir = join(distDir, slug);
    await rm(targetDir, { recursive: true, force: true });
    await cp(modelDistDir, targetDir, { recursive: true });

    let displayName = toDisplayName(slug);
    let modelName = displayName;
    let toolName: string | null = null;
    let modeName: string | null = null;
    let providerName: string | null = null;
    let timeTaken: string | null = null;
    let dollarCost: string | null = null;

    const infoPath = join(modelRoot, "info.json");
    if (await pathExists(infoPath)) {
      try {
        const infoRaw = await readFile(infoPath, "utf8");
        const info = JSON.parse(infoRaw) as {
          config?: {
            tool?: unknown;
            tool_mode?: unknown;
            model?: unknown;
            provider?: unknown;
          };
          results?: {
            time_taken?: unknown;
            dollar_cost?: unknown;
          };
        };

        const config = info?.config ?? {};
        const modelNameCandidate = pickString(config.model);
        const toolNameCandidate = pickString(config.tool);
        const modeNameCandidate = pickString(config.tool_mode);
        providerName = pickString(config.provider);

        if (modelNameCandidate) {
          displayName = modelNameCandidate;
          modelName = modelNameCandidate;
        }
        if (toolNameCandidate) {
          toolName = toolNameCandidate;
        }
        if (modeNameCandidate) {
          modeName = modeNameCandidate;
        }

        const results = info?.results ?? {};
        timeTaken = pickString(results.time_taken);
        dollarCost = pickString(results.dollar_cost);
      } catch (error) {
        console.warn(`无法读取 ${slug} 的 info.json:`, error);
      }
    }

    // Ensure modelName aligns with the final display name for analytics consistency
    modelName = modelName ?? displayName;

    // Generate badges HTML
    const badgesHtml: string[] = [];
    if (toolName) {
      badgesHtml.push(`<span class="badge badge-tool">${toolName}</span>`);
    }
    if (modeName) {
      badgesHtml.push(`<span class="badge badge-mode">${modeName}</span>`);
    }
    if (providerName) {
      badgesHtml.push(`<span class="badge badge-provider">${providerName}</span>`);
    }

    const badgesSection = badgesHtml.length > 0
      ? `                <div class="badges">\n                    ${badgesHtml.join('\n                    ')}\n                </div>`
      : '';

    // Generate metrics HTML
    const metricsHtml: string[] = [];
    if (timeTaken) {
      metricsHtml.push(`                    <div class="metric">
                        <div class="metric-label">运行时间</div>
                        <div class="metric-value">${timeTaken}</div>
                    </div>`);
    }
    if (dollarCost !== null) {
      const cost = parseFloat(dollarCost);
      let costClass = 'cost-medium';
      if (cost === 0) costClass = 'cost-free';
      else if (cost < 0.2) costClass = 'cost-low';
      else if (cost > 0.5) costClass = 'cost-high';
      
      const costDisplay = cost === 0 ? '免费' : `$${dollarCost}`;
      metricsHtml.push(`                    <div class="metric">
                        <div class="metric-label">成本</div>
                        <div class="metric-value ${costClass}">${costDisplay}</div>
                    </div>`);
    }

    const metricsSection = metricsHtml.length > 0
      ? `\n                <div class="metrics">\n${metricsHtml.join('\n')}\n                </div>`
      : '';

    const dataAttributes = [
      `data-model-name="${escapeHtmlAttr(modelName)}"`,
      toolName ? `data-tool-name="${escapeHtmlAttr(toolName)}"` : "",
      modeName ? `data-tool-mode="${escapeHtmlAttr(modeName)}"` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const linkHtml = `            <a href="${slug}/" class="model-card" ${dataAttributes}>
                <div class="model-header">
                    <div class="model-name">${displayName}</div>
                    <span class="arrow">→</span>
                </div>
${badgesSection}${metricsSection}
            </a>`;
    modelLinks.push(linkHtml);
  }

  const renderedLinks =
    modelLinks.length > 0
      ? modelLinks.join("\n              \n")
      : "            <div class=\"no-models\">暂无可用的构建版本</div>";

  await writeFile(distIndexPath, template.replace(TEMPLATE_PLACEHOLDER, renderedLinks), "utf8");

  console.log(`✅ 已生成 index.html，包含 ${modelLinks.length} 个模型链接`);
}

async function runBuild(cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("bun", ["build", "./index.html", "--outdir", "dist"], {
      cwd,
      stdio: "inherit",
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`bun build exited with code ${code}`));
      }
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
