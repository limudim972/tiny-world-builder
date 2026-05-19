# Agent Notes

- Use UTF-8 when reading or writing text files:
  - `Get-Content -Encoding UTF8`
  - `Set-Content -Encoding UTF8`
- Prefer `apply_patch` for edits so file encoding is preserved.
- Before finishing any text-only change, scan for mojibake like `Ã`, `Â`, `â`, or `Ï` and fix it immediately.
- If a symbol is meant to be typographic, write the real character directly instead of an ASCII fallback.
- Do not re-save files through tools that may default to a legacy code page.
