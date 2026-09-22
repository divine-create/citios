# CityOS Development Workflow

## Repository Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure `.env.local` based on `.env.example` (requires `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.).
4. The postinstall script `prisma skills sync` is executed automatically.

## Development Commands
- **Start Dev Server**: `npm run dev`
- **Build Production**: `npm run build`
- **Run Tests**: `npm run test` (executes the native Node.js test runner via `tsx --test lib/*.test.ts`)
- **Lint**: `npm run lint`
- **Emit Prisma Schema**: `npm run contract:emit` (MUST be run after modifying `contract.prisma`)

## Development Workflow
When making changes, adhere to this cycle:
1. **Understand**: Read `AGENTS.md` and relevant documentation.
2. **Inspect**: Search the repository for existing implementations, abstractions, or shared components before writing new ones.
3. **Plan Minimally**: Design a fix that addresses the specific issue without unwarranted refactoring.
4. **Implement**: Write the code, prioritizing server-side security.
5. **Test**: Run `npm run test` and add tests for new logic.
6. **Validate**: Run `npm run build` to ensure Type safety and Next.js compilation pass.
7. **Commit**: Keep commits focused and atomic.

## Change Scope
A task should modify the smallest reasonable surface area. Do not perform sweeping refactors, rename variables in unrelated files, or format code outside your immediate objective. Preserving the existing architecture and Git history is critical.

## Database Changes
1. **Source of Truth**: `src/prisma/contract.prisma` is the canonical schema. Do NOT edit generated Prisma client files.
2. **Modify Schema**: Make your changes in `contract.prisma`.
3. **Compile**: Run `npm run contract:emit` to update the generated `contract.json` and `contract.d.ts` artifacts.
4. **Commit**: You MUST commit both the `.prisma` file and the generated artifacts, or remote builds will fail.

## Testing
- **Test Runner**: Node.js native test runner via `tsx` (`npm run test`).
- **Integration/Security Tests**: Found in `lib/*.test.ts` (e.g., `lib/retail.test.ts`). These test actual server action logic and transactional behavior.
- **Rule**: If you fix a security vulnerability (e.g., an oversell bug, an IDOR), you must add a deterministic regression test proving the constraint works.

## Debugging
- Because Server Actions execute on the backend, use `console.error` and `console.log` heavily in `lib/actions/*.ts` and inspect the Next.js terminal output.
- Prisma errors (e.g., Unique Constraint Violations, Record Not Found) are exposed through `db` calls; wrap mutations in `try/catch` and return `{ error: string }` safely to the client.
