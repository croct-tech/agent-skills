import {existsSync, readdirSync, readFileSync, statSync} from 'fs';
import {basename, dirname, join, resolve} from 'path';

const SKILLS_DIR = resolve(__dirname, '..', 'skills');
const NAME_PATTERN = /^croct(-[a-z0-9]+)+$/;
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

type Frontmatter = Record<string, string>;

function parseFrontmatter(content: string): Frontmatter | null {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(content);

    if (match === null) {
        return null;
    }

    const fields: Frontmatter = {};
    const lines = match[1].split('\n');

    for (let index = 0; index < lines.length; index++) {
        const field = /^([a-z][\w-]*):\s*(.*)$/.exec(lines[index]);

        if (field === null) {
            continue;
        }

        let value = field[2].trim();

        // Folded or literal block scalars, and plain values continued on indented lines
        if (value === '' || value === '>-' || value === '>' || value === '|' || value === '|-') {
            const parts: string[] = [];

            while (index + 1 < lines.length && /^\s+\S/.test(lines[index + 1])) {
                parts.push(lines[++index].trim());
            }

            value = parts.join(' ');
        }

        fields[field[1]] = value.replace(/^(['"])([\s\S]*)\1$/, '$2');
    }

    return fields;
}

function listMarkdownFiles(directory: string): string[] {
    return readdirSync(directory).flatMap(entry => {
        const path = join(directory, entry);

        if (statSync(path).isDirectory()) {
            return listMarkdownFiles(path);
        }

        return entry.endsWith('.md') ? [path] : [];
    });
}

function findBrokenLinks(file: string): string[] {
    const content = readFileSync(file, 'utf8')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`\n]*`/g, '');
    const broken: string[] = [];

    for (const [, target] of content.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#|\/)/.test(target)) {
            continue;
        }

        if (!existsSync(resolve(dirname(file), target.split('#')[0]))) {
            broken.push(target);
        }
    }

    return broken;
}

function validateSkill(directory: string): string[] {
    const errors: string[] = [];
    const name = directory.split('/').pop()!;
    const skillFile = join(directory, 'SKILL.md');

    if (!existsSync(skillFile)) {
        return ['missing SKILL.md'];
    }

    const frontmatter = parseFrontmatter(readFileSync(skillFile, 'utf8'));

    if (frontmatter === null) {
        return ['SKILL.md has no frontmatter'];
    }

    if (frontmatter.name !== name) {
        errors.push(`name "${frontmatter.name}" does not match directory "${name}"`);
    }

    if (!NAME_PATTERN.test(name) || name.length > MAX_NAME_LENGTH) {
        errors.push(`name "${name}" must be kebab-case, start with "croct-", and be at most ${MAX_NAME_LENGTH} characters`);
    }

    const description = frontmatter.description ?? '';

    if (description === '') {
        errors.push('description is missing');
    } else if (description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push(`description has ${description.length} characters, the limit is ${MAX_DESCRIPTION_LENGTH}`);
    }

    for (const file of listMarkdownFiles(directory)) {
        for (const link of findBrokenLinks(file)) {
            errors.push(`${file.slice(directory.length + 1)}: broken link "${link}"`);
        }
    }

    return errors;
}

const skills = readdirSync(SKILLS_DIR)
    .map(entry => join(SKILLS_DIR, entry))
    .filter(path => !basename(path).startsWith('.') && statSync(path).isDirectory());

let failures = 0;

for (const skill of skills) {
    const errors = validateSkill(skill);
    const name = skill.split('/').pop();

    if (errors.length === 0) {
        console.log(`✓ ${name}`);

        continue;
    }

    failures++;
    console.log(`✗ ${name}`);

    for (const error of errors) {
        console.log(`  - ${error}`);
    }
}

console.log(`\n${skills.length - failures}/${skills.length} skills valid`);

const ROOT_DIR = resolve(__dirname, '..');
const MANIFESTS = [
    'package.json',
    'plugin.json',
    '.claude-plugin/plugin.json',
    '.cursor-plugin/plugin.json',
    '.codex-plugin/plugin.json',
];

const versions = MANIFESTS.map(file => {
    const manifest = JSON.parse(readFileSync(join(ROOT_DIR, file), 'utf8'));

    return `${file}: ${manifest.version}`;
});

if (new Set(versions.map(entry => entry.split(': ')[1])).size > 1) {
    failures++;
    console.log(`\n✗ manifest versions differ:\n  - ${versions.join('\n  - ')}`);
}

process.exitCode = failures > 0 ? 1 : 0;
