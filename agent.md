# Agent Notes

- Use UTF-8 when reading or writing text files:
  - `Get-Content -Encoding UTF8`
  - `Set-Content -Encoding UTF8`
- Use `apply_patch` for edits so file encoding is preserved.
- `C` always means "commit" in this repo.
- If the user sends c, interpret it as a request to create a git commit.
