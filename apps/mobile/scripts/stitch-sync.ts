import { mkdir, readdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import * as cheerio from 'cheerio';
import { stitch } from '@google/stitch-sdk';

type DeviceType = 'MOBILE' | 'TABLET' | 'DESKTOP';

type StitchScreenBundle = {
  id: string;
  slug: string;
  title: string;
  source: {
    projectId: string;
    projectTitle?: string;
    screenId: string;
    prompt?: string;
    deviceType: DeviceType;
    syncedAt: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  summary: {
    overview: string;
    colors: string[];
    keyTexts: string[];
    actions: string[];
  };
  sections: Array<{
    id: string;
    title: string;
    body: string;
    bullets: string[];
  }>;
};

type CliOptions = {
  projectId?: string;
  projectTitle?: string;
  screenId?: string;
  prompt?: string;
  deviceType: DeviceType;
  slug?: string;
  title?: string;
  clean?: boolean;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const stitchRoot = path.join(mobileRoot, 'stitch');
const generatedRoot = path.join(mobileRoot, 'src', 'stitch', 'generated');
const registryPath = path.join(generatedRoot, 'index.ts');

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.projectId && !options.projectTitle) {
    throw new Error('Please provide --project-id or --project-title.');
  }

  if (!options.screenId && !options.prompt) {
    throw new Error('Please provide --screen-id for an existing Stitch screen, or --prompt to generate one.');
  }

  const projectId = options.projectId ?? (await createProject(options.projectTitle ?? 'LoveMenu Stitch Sync'));
  const screenInfo = await resolveScreen(projectId, options);
  const html = await fetchText(screenInfo.htmlUrl);
  const screenshot = await fetchBinary(screenInfo.imageUrl);
  const bundle = buildBundle({
    html,
    prompt: screenInfo.prompt,
    projectId,
    projectTitle: options.projectTitle,
    screenId: screenInfo.screenId,
    slug: options.slug,
    title: options.title ?? screenInfo.title,
    deviceType: options.deviceType,
  });

  const targetDir = path.join(stitchRoot, bundle.slug);
  if (options.clean) {
    await rm(targetDir, { recursive: true, force: true });
  }

  await mkdir(targetDir, { recursive: true });
  await mkdir(generatedRoot, { recursive: true });

  await writeFile(path.join(targetDir, 'screen.html'), html, 'utf8');
  await writeFile(path.join(targetDir, 'screenshot.png'), screenshot);
  await writeFile(path.join(targetDir, 'bundle.json'), JSON.stringify(bundle, null, 2), 'utf8');
  await writeFile(path.join(targetDir, 'design-notes.md'), createDesignNotes(bundle), 'utf8');
  await writeFile(path.join(generatedRoot, `${bundle.slug}.ts`), createGeneratedModule(bundle), 'utf8');
  await syncRegistry();

  process.stdout.write(
    [
      `Stitch screen synced successfully.`,
      `Project: ${projectId}`,
      `Screen: ${bundle.source.screenId}`,
      `Bundle: ${path.relative(mobileRoot, targetDir)}`,
      `Preview module: ${path.relative(mobileRoot, path.join(generatedRoot, `${bundle.slug}.ts`))}`,
    ].join('\n'),
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    deviceType: 'MOBILE',
    clean: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--project-id' && next) {
      options.projectId = next;
      index += 1;
      continue;
    }

    if (current === '--project-title' && next) {
      options.projectTitle = next;
      index += 1;
      continue;
    }

    if (current === '--screen-id' && next) {
      options.screenId = next;
      index += 1;
      continue;
    }

    if (current === '--prompt' && next) {
      options.prompt = next;
      index += 1;
      continue;
    }

    if (current === '--slug' && next) {
      options.slug = next;
      index += 1;
      continue;
    }

    if (current === '--title' && next) {
      options.title = next;
      index += 1;
      continue;
    }

    if (current === '--device-type' && next) {
      options.deviceType = next.toUpperCase() as DeviceType;
      index += 1;
      continue;
    }

    if (current === '--clean') {
      options.clean = true;
    }
  }

  return options;
}

async function createProject(projectTitle: string) {
  const result = await stitch.callTool('create_project', { title: projectTitle });
  const projectId = extractFirstString(result, (value, key) => key.toLowerCase().includes('project') && /\d+/.test(value));

  if (!projectId) {
    throw new Error('Unable to resolve project id from Stitch create_project response.');
  }

  return projectId;
}

async function resolveScreen(projectId: string, options: CliOptions) {
  if (options.screenId) {
    const imageUrl = await stitch.callTool('get_screen_image_url', { screenId: options.screenId });
    const htmlUrl = await stitch.callTool('export_screen_to_html', { screenId: options.screenId });

    return {
      screenId: options.screenId,
      title: options.title ?? `Stitch ${options.screenId}`,
      prompt: options.prompt,
      imageUrl: extractUrl(imageUrl),
      htmlUrl: extractUrl(htmlUrl),
    };
  }

  const prompt = options.prompt;
  if (!prompt) {
    throw new Error('Missing --prompt for Stitch screen generation.');
  }

  const created = await stitch.callTool('generate_screen', {
    projectId,
    prompt,
    screenTitle: options.title ?? 'Codex Synced Screen',
    deviceType: options.deviceType,
  });

  const screenId = extractFirstString(created, (value, key) => key.toLowerCase().includes('screen') && /\d+/.test(value));
  if (!screenId) {
    throw new Error('Unable to resolve screen id from Stitch generate_screen response.');
  }

  const imageUrl = await stitch.callTool('get_screen_image_url', { screenId });
  const htmlUrl = await stitch.callTool('export_screen_to_html', { screenId });

  return {
    screenId,
    title: options.title ?? 'Codex Synced Screen',
    prompt,
    imageUrl: extractUrl(imageUrl),
    htmlUrl: extractUrl(htmlUrl),
  };
}

function extractUrl(value: unknown) {
  const url = extractFirstString(value, (candidate) => candidate.startsWith('http://') || candidate.startsWith('https://'));

  if (!url) {
    throw new Error('Unable to resolve URL from Stitch response.');
  }

  return url;
}

function extractFirstString(
  value: unknown,
  matcher: (candidate: string, key: string) => boolean,
  parentKey = '',
): string | undefined {
  if (typeof value === 'string') {
    return matcher(value, parentKey) ? value : undefined;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractFirstString(item, matcher, parentKey);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const found = extractFirstString(nestedValue, matcher, key);
    if (found) {
      return found;
    }
  }

  return undefined;
}

async function fetchText(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Stitch HTML: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchBinary(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Stitch screenshot: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function buildBundle(input: {
  html: string;
  prompt?: string;
  projectId: string;
  projectTitle?: string;
  screenId: string;
  slug?: string;
  title?: string;
  deviceType: DeviceType;
}): StitchScreenBundle {
  const $ = cheerio.load(input.html);
  const title = input.title ?? ($('title').first().text().trim() || $('h1').first().text().trim() || 'Stitch Screen');
  const slug = input.slug ? toSlug(input.slug) : toSlug(title || input.screenId);

  const headingTexts = collectTexts($, ['h1', 'h2', 'h3', 'h4']);
  const paragraphTexts = collectTexts($, ['p', 'span', 'label'], 20);
  const buttonTexts = collectTexts($, ['button', 'a'], 10);
  const inputHints = $('input, textarea')
    .map((_: number, element: unknown) => $(element).attr('placeholder')?.trim() ?? '')
    .get()
    .filter(Boolean)
    .slice(0, 8);
  const colors = Array.from(new Set(input.html.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g) ?? [])).slice(0, 8);

  const overview = paragraphTexts[0] ?? 'Stitch 已生成原始设计稿，Codex 已把主要结构整理成可运行页面骨架。';
  const heroTitle = headingTexts[0] ?? title;
  const subtitle = paragraphTexts[0] ?? input.prompt ?? '使用 Stitch 生成的设计内容自动同步而来。';

  const sectionSource = headingTexts.slice(1, 7);
  const sections = (sectionSource.length > 0 ? sectionSource : ['布局结构', '设计动作', '交互线索']).map((sectionTitle, index) => {
    const related = paragraphTexts.slice(index * 2, index * 2 + 3);

    return {
      id: `${slug}-section-${index + 1}`,
      title: sectionTitle,
      body: related[0] ?? '该模块由 Stitch HTML 内容抽取生成，后续可以继续替换成真实业务组件。',
      bullets: [...related.slice(1), ...buttonTexts.slice(index, index + 1), ...inputHints.slice(index, index + 1)].filter(Boolean).slice(0, 3),
    };
  });

  return {
    id: slug,
    slug,
    title,
    source: {
      projectId: input.projectId,
      projectTitle: input.projectTitle,
      screenId: input.screenId,
      prompt: input.prompt,
      deviceType: input.deviceType,
      syncedAt: new Date().toISOString(),
    },
    hero: {
      eyebrow: 'Stitch Sync',
      title: heroTitle,
      subtitle,
    },
    summary: {
      overview,
      colors,
      keyTexts: [...headingTexts, ...paragraphTexts].filter(Boolean).slice(0, 8),
      actions: [...buttonTexts, ...inputHints].filter(Boolean).slice(0, 6),
    },
    sections,
  };
}

function collectTexts($: cheerio.CheerioAPI, selectors: string[], limit = 12) {
  return selectors
    .flatMap((selector) =>
      $(selector)
        .map((_: number, element: unknown) => $(element).text().replace(/\s+/g, ' ').trim())
        .get(),
    )
    .filter((text) => Boolean(text) && text.length >= 2)
    .slice(0, limit);
}

function createDesignNotes(bundle: StitchScreenBundle) {
  return [
    `# ${bundle.title}`,
    '',
    '## Source',
    `- projectId: ${bundle.source.projectId}`,
    `- screenId: ${bundle.source.screenId}`,
    `- deviceType: ${bundle.source.deviceType}`,
    `- syncedAt: ${bundle.source.syncedAt}`,
    bundle.source.prompt ? `- prompt: ${bundle.source.prompt}` : null,
    '',
    '## Overview',
    bundle.summary.overview,
    '',
    '## Colors',
    bundle.summary.colors.length > 0 ? bundle.summary.colors.map((color) => `- ${color}`).join('\n') : '- No explicit hex colors found in exported HTML.',
    '',
    '## Key Texts',
    bundle.summary.keyTexts.map((text) => `- ${text}`).join('\n'),
    '',
    '## Actions',
    bundle.summary.actions.length > 0 ? bundle.summary.actions.map((text) => `- ${text}`).join('\n') : '- No obvious CTA text found.',
  ]
    .filter(Boolean)
    .join('\n');
}

function createGeneratedModule(bundle: StitchScreenBundle) {
  return `import { StitchScreenBundle } from '../types';

const screenshot = require('../../../stitch/${bundle.slug}/screenshot.png');

export const ${toPascalCase(bundle.slug)}Bundle: StitchScreenBundle = {
  ...${JSON.stringify(bundle, null, 2)},
  screenshot,
};
`;
}

async function syncRegistry() {
  const fileNames = await readGeneratedModuleNames();
  const imports = fileNames.map((fileName: string) => {
    const basename = path.basename(fileName, '.ts');
    return `import { ${toPascalCase(basename)}Bundle } from './${basename}';`;
  });
  const exports = `export const stitchGeneratedScreens = [${fileNames
    .map((fileName: string) => `${toPascalCase(path.basename(fileName, '.ts'))}Bundle`)
    .join(', ')}];`;

  const content = [imports.join('\n'), '', exports, ''].join('\n');
  await writeFile(registryPath, content, 'utf8');
}

async function readGeneratedModuleNames() {
  const entries = await readdir(generatedRoot, { withFileTypes: true });

  return entries
    .filter((entry: { isFile: () => boolean; name: string }) => entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'index.ts' && entry.name !== 'types.ts')
    .map((entry: { name: string }) => entry.name)
    .sort();
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function toPascalCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
