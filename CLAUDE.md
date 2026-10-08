# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dependency-free browser TODO app (vanilla HTML/CSS/JS, no build step, no package.json). UI text and code comments are in Korean.

## Commands

- Run: open `index.html` directly, or serve with `npx http-server` (default port **8080**; use `-p <port>` to change).
- Syntax check: `node --check app.js`
- There are no tests or linter.
- On this Windows machine, PowerShell's CurrentUser execution policy is set to `RemoteSigned` so `npx` works; `npx.cmd` is the fallback if it is blocked.

## Architecture (`app.js`)

- **Single state array** `todos` (`{ id, title, due, completed, createdAt }`, `due` is a local `YYYY-MM-DD` string or `null`) plus `filter` (`all` | `active` | `completed`).
- **All mutations go through `update(fn)`**, which runs `fn`, persists to `localStorage`, and calls `render()`. Keep this pattern: don't save or render manually from event handlers.
- **`render()` rebuilds the whole list** from `<template id="todo-item-template">` in `index.html` via `replaceChildren`. Item markup and class names (`.toggle`, `.title`, `.due`, `.edit`, `.delete`) are shared contracts between `index.html`, `style.css`, and `app.js`.
- **Events are delegated** on `#todo-list` and find the item by `closest('.todo-item').dataset.id`. Don't bind listeners to individual items.
- **Editing** is CSS-driven: the `.editing` class on the `<li>` swaps `.body` for the `.edit` input. `finishEditing` checks that class, so the blur that follows Enter or Esc doesn't commit twice. An empty title on commit deletes the item. Enter is ignored while `e.isComposing`, which matters for Korean IME input.
- **Persistence:** keys `todo-app.v1` (todos) and `todo-app.filter`. Every `localStorage` access is wrapped in try/catch. A `storage` event listener syncs changes across tabs. Bump the `.v1` key if the stored shape changes incompatibly.
- **Dates:** compare `YYYY-MM-DD` strings produced by `localISODate()`, which uses local time. Don't use `toISOString()`, because it is UTC and shifts the date in KST.
- **User text** is inserted with `textContent` only. Never use `innerHTML`.

## Styling (`style.css`)

Colors are CSS custom properties on `:root`, overridden in `@media (prefers-color-scheme: dark)`. Add new colors as tokens in both blocks.
