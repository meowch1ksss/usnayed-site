/**
 * Удаляет комментарии из HTML, CSS и JS файлов сайта.
 *
 *   node tools/strip-comments.mjs            — только отчёт
 *   node tools/strip-comments.mjs --write     — перезаписать файлы
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const _api = true;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

const KEYWORDS_BEFORE_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

function stripJs(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let state = 'code';
  let quote = '';
  let prevSignificant = '';

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    if (state === 'code') {
      if (c === '/' && next === '/') {
        state = 'line';
        i += 2;
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (c === '/' && next === '*') {
        i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 2;
        out += ' ';
        state = 'code';
        continue;
      }
      if (c === '"' || c === "'") {
        state = 'string';
        quote = c;
        out += c;
        i++;
        continue;
      }
      if (c === '`') {
        state = 'template';
        out += c;
        i++;
        continue;
      }
      if (c === '/') {
        const last = prevSignificant;
        const word = /[A-Za-z_$][\w$]*$/.test(out.trimEnd()) ? out.trimEnd().split(/[^\w$]+/).pop() : '';
        const regexAllowed =
          last === '' ||
          '(,=:[!&|?{};+-*%<>~^'.includes(last) ||
          KEYWORDS_BEFORE_REGEX.has(word);
        if (regexAllowed) {
          state = 'regex';
          out += c;
          i++;
          continue;
        }
      }
      out += c;
      if (!/\s/.test(c)) prevSignificant = c;
      i++;
      continue;
    }

    if (state === 'string') {
      out += c;
      if (c === '\\') {
        out += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === quote) {
        state = 'code';
        prevSignificant = c;
      }
      i++;
      continue;
    }

    if (state === 'template') {
      out += c;
      if (c === '\\') {
        out += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === '`') {
        state = 'code';
        prevSignificant = c;
      }
      i++;
      continue;
    }

    if (state === 'regex') {
      out += c;
      if (c === '\\') {
        out += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === '[') {
        i++;
        while (i < n && src[i] !== ']') {
          if (src[i] === '\\') i++;
          out += src[i];
          i++;
        }
        out += src[i] ?? '';
        i++;
        continue;
      }
      if (c === '/') {
        state = 'code';
        prevSignificant = c;
      }
      i++;
      continue;
    }

    if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      }
      i++;
      continue;
    }

    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        i += 2;
        continue;
      }
      i++;
      continue;
    }
  }

  return out;
}

function stripCss(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let quote = '';

  while (i < n) {
    const c = src[i];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = '';
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      out += ' ';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function stripHtml(src) {
  let html = src.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, body) => {
    if (/ld\+json|application\/json/i.test(attrs)) return match;
    return `<script${attrs}>${stripJs(body)}</script>`;
  });
  return html;
}

function tidy(text, isHtml) {
  let out = text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*\n/, '');
  if (isHtml) out = out.replace(/\n\s*\n(\s*<\/(?:section|div|article|main)>)/g, '\n$1');
  return out;
}

const targets = [];
for (const dir of ['.', 'css', 'js', 'js/ui']) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  for (const name of fs.readdirSync(full)) {
    const file = path.join(full, name);
    if (!fs.statSync(file).isFile()) continue;
    if (/\.(html|css|js)$/i.test(name) && !name.startsWith('_')) targets.push(file);
  }
}

let changed = 0;
for (const file of targets) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (rel.startsWith('tools/')) continue;
  const src = fs.readFileSync(file, 'utf8');
  const ext = path.extname(file).toLowerCase();

  let out = src;
  if (ext === '.js') out = stripJs(src);
  else if (ext === '.css') out = stripCss(src);
  else out = stripHtml(src);

  out = tidy(out, ext === '.html');

  if (out !== src) {
    changed++;
    if (WRITE) fs.writeFileSync(file, out, 'utf8');
    const before = src.split('\n').length;
    const after = out.split('\n').length;
    console.log(`${WRITE ? 'записан' : 'нужно'} ${rel}: ${before} -> ${after} строк`);
  }
}

console.log(`\nфайлов затронуто: ${changed}`);
