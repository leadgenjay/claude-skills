# /commit Command

Create a well-formatted git commit with a clear, descriptive message.

## Usage

```
/commit
```

## Behavior

1. Run `git status` to see staged and unstaged changes
2. Run `git diff --cached` to see what will be committed
3. Analyze the changes and draft a commit message that:
   - Uses imperative mood ("Add feature" not "Added feature")
   - First line is 50 chars or less
   - Includes body if changes are complex
   - References issue numbers if mentioned
4. Stage relevant files if needed
5. Create the commit

## Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

### Example

```
feat: add user authentication flow

- Implement login/logout endpoints
- Add JWT token generation
- Create auth middleware
- Add password hashing with bcrypt

Closes #123
```

## Options

- Specify files: `/commit src/auth.ts`
- With message: `/commit -m "fix: resolve null pointer"`
- Amend: `/commit --amend`
