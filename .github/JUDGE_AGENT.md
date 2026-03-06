# Judge Agent - Pythia Code Review

## Mission
Review code before every commit to find issues judges will catch.

## Checklist (Run Before Every Commit)

### 1. TypeScript Check
```bash
cd frontend && npx tsc --noEmit
```
Must pass with 0 errors.

### 2. Build Check
```bash
cd frontend && npm run build
```
Must complete successfully.

### 3. Import Check
- All imports resolve?
- No circular dependencies?
- Paths correct?

### 4. API Keys Check
- `.env.example` exists with all required keys
- No hardcoded secrets in code

### 5. Functionality Check
- Does it actually work?
- Mock data clearly marked?
- Real features vs fake features documented?

### 6. Security Check
- No private keys/secrets in code
- No SQL injection vectors
- No unchecked .send() calls in Solidity

## Common Judge Questions

| Question | What to Check |
|----------|---------------|
| "Does it work?" | Build passes, no console errors |
| "Where's the demo?" | Deployed contract address in config |
| "What's real vs fake?" | Mock data has comments |
| "How do you resolve?" | Workflow deployed + API keys set |
| "What's the business model?" | Clear in README |

## Proactive Commands

Run these BEFORE pushing:
```bash
# In frontend/
npx tsc --noEmit  # Must be 0 errors
npm run build      # Must succeed

# In contracts/
forge build       # Must succeed
forge test        # Tests pass
```

## Report Template

```
## Judge Report

### TypeScript: ✅/❌
### Build: ✅/❌  
### Imports: ✅/❌
### API Keys: ✅/❌
### Security: ✅/❌

### Issues Found:
- [ ]

### What Judges Will Ask:
1. 
2. 

### Score: /10
```
