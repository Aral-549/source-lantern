# Contract: local research projects

## Purpose

Organize arbitrary research questions and documents in separate local projects, with a Codex-like project list. Delegate document reading and OCR to their own modules.

## Inputs

- Project name, selected project ID, document files/links/text, workspace state and browser storage availability.

## Outputs

- Persistent project records and source files in IndexedDB; a project sidebar; isolated documents, questions, analyses, chats and checklist state.

## Behavior cases (input -> expected output)

| # | Input | Expected output | Notes |
| --- | --- | --- | --- |
| P01 | Create project with a nonempty name | Add it to the sidebar and open its empty workspace | General research, no scholarship theme |
| P02 | Empty or whitespace-only name | Inline validation, no project created | Names up to 100 characters |
| P03 | Add files, links or text within a project | Save records under that project; show readable source list | Files retain their original bytes |
| P04 | Switch projects | Show only that project's documents/question/results/chat/checks | Abort obsolete pending work |
| P05 | Reload browser | Restore projects and files from IndexedDB, not expired object URLs | Recreate/release preview URLs per session |
| P06 | Rename a project | Update its name while preserving IDs and contents | No duplicate content |
| P07 | Move a document to another project | Transfer ownership and invalidate affected analysis references | No cross-project citation leakage |
| P08 | Archive a project | Hide from active list; allow restoration | No irreversible deletion |
| P09 | Storage unavailable/full or a write fails | Clear error and recovery/export guidance | Never report saved when write failed |
| P10 | Load sample | Create or open a clearly labelled sample project | No overwriting a user's project |
| P11 | Open app with no project | Offer Create project and sample entry | No fake project history |
| P12 | Render controls/source lists | Minimum 16px text (user corrected the oversized 16pt interpretation), strong weight at minimum size, visible focus | No clipped essential titles or actions |

## Edge cases that must be covered

- Duplicate names, corrupt records, missing files, switching during upload/OCR/chat, and restoring an archived project.
- Project IDs and source revisions remain stable; all operations and async commits enforce project ownership.
- Storage is local to this browser/device, not cloud synchronization or a backup guarantee.

## Explicitly out of scope

- Accounts, shared projects, cloud sync, team permissions and permanent deletion.

## Status

- [x] Drafted
- [x] Reviewed by a human -- explicit approval, 31 October 2026
- [ ] Implementation matches this contract
- [ ] Golden tests exist for every behavior case above
