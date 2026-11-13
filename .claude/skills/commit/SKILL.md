---
name: commit
description: Use whenever the user says "commit" (or "commit this", "save my work to git") in the Crawlvane repo. Moves the uncommitted work onto a fresh branch made from the latest main, then commits it with a clear title and description. Does not push unless asked.
---

# Commit on a fresh branch from the latest main

When the user says **commit**, follow these steps in order. Stop and tell the user if any step fails; never force anything.

## 1. Check before moving

- Run `npm test` and `npx tsc --noEmit --incremental false` (ignore errors that only come from the `.next/` folder). If tests or the type check fail, say so and ask before committing.
- Run `git status --short` and look at what will be committed. Never commit `.env*` files with real values (`.env.local` is ignored), keys, tokens or anything from the scratchpad. `.env.example` is fine because it holds placeholders only.

## 2. Get the latest main

```bash
git fetch origin
```

Check whether the current branch has commits that `origin/main` doesn't:

```bash
git log --oneline origin/main..HEAD
```

- **Empty:** everything is already on main. Continue.
- **Not empty:** those commits aren't on main yet, so branching from main would leave them behind. Tell the user which commits and ask whether to branch from the current branch instead, or to open a pull request for them first. Don't continue until they choose.

Then move the work across:

```bash
git stash push -u -m "<short summary of the work>"
git checkout main
git pull --ff-only origin main
```

If `git pull --ff-only` fails (local main has its own commits), stop and ask; don't reset or rebase without the user saying so.

## 3. Create the branch

```bash
git checkout -b <branch-name>
git stash pop
```

- Name the branch after the work: short, lowercase, words joined with hyphens, for example `security-seo-email-templates` or `fix-sign-in-redirect`. If the name exists, add a short suffix such as `-2`.
- If `git stash pop` reports conflicts, stop, list the conflicting files and ask how to resolve them. The stash is kept until it applies cleanly.

## 4. Commit with a title and a description

```bash
git add -A
git commit -F - <<'EOF'
<Title: imperative, under 70 characters, says what changed>

<Description: a short paragraph or a few lines grouped by area, saying what
changed and why. Mention anything the user has to do next, such as running
the latest supabase/schema.sql or adding a setting.>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Write the title and description for someone reading the project history later: plain words, no jargon, what changed and why.

## 5. Report

Tell the user the branch name, the commit hash and title, how many files changed, and what's left (for example "not pushed yet"). **Don't push or open a pull request unless the user asks.** When they do, push with `git push -u origin <branch-name>` and open the pull request with `gh pr create`, using the same title and description.
