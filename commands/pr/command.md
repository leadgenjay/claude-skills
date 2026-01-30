# /pr Command

Create a pull request with a well-structured description.

## Usage

```
/pr
/pr --draft
/pr --base develop
```

## Behavior

1. Check current branch and compare with base branch
2. Run `git log base..HEAD` to see commits
3. Run `git diff base...HEAD` to see all changes
4. Generate PR title and description:
   - Title: Clear, concise summary
   - Summary: What and why
   - Changes: Bullet points of key changes
   - Testing: How to test
   - Screenshots: If UI changes
5. Push branch if needed
6. Create PR using `gh pr create`

## PR Template

```markdown
## Summary
Brief description of what this PR does and why.

## Changes
- List of key changes
- Another change
- And another

## Testing
- [ ] Step to test
- [ ] Another step

## Screenshots
(if applicable)

## Related Issues
Closes #123
```

## Options

- `--draft`: Create as draft PR
- `--base <branch>`: Specify base branch
- `--reviewer <user>`: Request review
- `--label <label>`: Add labels

## Examples

```
/pr                           # Standard PR to main
/pr --draft                   # Draft PR
/pr --base develop           # PR to develop branch
/pr --reviewer @teammate     # Request review
```
