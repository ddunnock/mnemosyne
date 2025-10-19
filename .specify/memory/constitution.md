<!--
============================================================================
CONSTITUTION SYNC IMPACT REPORT
============================================================================

Version Change: INITIAL → 1.0.0
Constitution Status: NEW - First ratification

Added Principles:
- I. Clean Code First
- II. Professional Documentation & Comments
- III. Type Safety & Validation
- IV. Test Coverage
- V. Code Review Standards

Added Sections:
- Code Quality Standards
- Development Workflow
- Governance

Templates Requiring Updates:
✅ plan-template.md - Constitution Check section aligned
✅ spec-template.md - Requirements enforce documentation standards
✅ tasks-template.md - Task structure supports code quality gates
⚠️ No command files found to update

Follow-up TODOs:
- None - all placeholders filled

Last Updated: 2025-10-18
============================================================================
-->

# Mnemosyne Constitution

## Core Principles

### I. Clean Code First

**Every line of code must be self-documenting, maintainable, and follow established patterns.**

- Code MUST prioritize readability over cleverness
- Variable and function names MUST be descriptive and unambiguous (e.g., `getUserById` not `get`)
- Functions MUST do one thing well - single responsibility principle is NON-NEGOTIABLE
- Magic numbers and strings MUST be replaced with named constants
- Nested logic beyond 3 levels MUST be refactored
- Duplicate code blocks (>5 lines) MUST be extracted into reusable functions
- File length MUST NOT exceed 300 lines - refactor into modules if exceeded

**Rationale**: Clean code reduces bugs, accelerates development, and ensures long-term maintainability. Technical debt accumulates faster than features can be built when cleanliness is compromised.

### II. Professional Documentation & Comments

**All code artifacts must include comprehensive, professional documentation at the appropriate level.**

**File-Level Documentation (MANDATORY)**:
- Every `.ts`, `.tsx`, `.js` file MUST begin with a header comment containing:
  - Brief description of the file's purpose
  - Key classes/functions exported
  - Dependencies or architectural notes if non-obvious

**Example**:
```typescript
/**
 * AgentController.ts
 *
 * Manages AI agent lifecycle, configuration, and execution.
 * Coordinates between AgentStorage, LLMService, and RAGEngine.
 *
 * Key exports: AgentController, AgentConfig, AgentStatus
 */
```

**Function/Method Documentation (MANDATORY)**:
- Public functions MUST have JSDoc/TSDoc comments including:
  - Purpose and behavior description
  - `@param` for each parameter with type and description
  - `@returns` with type and description
  - `@throws` for expected exceptions
  - `@example` for complex functions

**Inline Comments (SELECTIVE - USE SPARINGLY)**:
- Inline comments MUST explain **WHY**, never **WHAT** (code should be self-documenting)
- Use inline comments for:
  - Non-obvious business logic or constraints
  - Performance optimizations with rationale
  - Workarounds for known issues (include issue/ticket reference)
  - Algorithm explanations when implementation is complex

**Prohibited Comment Types**:
- ❌ Commented-out code (delete it - version control remembers)
- ❌ Obvious comments that restate the code
- ❌ TODO comments without owner and date (use issue tracker instead)

**Rationale**: Professional documentation enables team collaboration, reduces onboarding time, and prevents knowledge silos. Comments explaining intent prevent future developers from breaking subtle invariants.

### III. Type Safety & Validation

**All code must leverage TypeScript's type system to prevent runtime errors and document contracts.**

- Explicit types MUST be used for all public APIs (no implicit `any`)
- `any` type is PROHIBITED except when typing truly dynamic external data (must be justified in code review)
- Input validation MUST occur at system boundaries (API endpoints, user input, external data)
- Discriminated unions MUST be used for state machines and complex enums
- Null/undefined handling MUST be explicit (`?` operator, null checks, optional chaining)
- Type guards MUST be created for runtime type narrowing
- Generic types MUST be used to maintain type safety in reusable utilities

**Rationale**: TypeScript's type system catches entire classes of bugs at compile time. Proper typing serves as machine-verified documentation and enables confident refactoring.

### IV. Test Coverage

**Critical paths and public APIs must be covered by automated tests.**

**Test Requirements**:
- New features MUST include tests covering happy path and primary edge cases
- Bug fixes MUST include a regression test that reproduces the bug
- Public API functions MUST have unit tests
- Critical user journeys MUST have integration tests
- Test coverage SHOULD be monitored but NOT enforced as a strict percentage (focus on meaningful coverage)

**Test Quality Standards**:
- Test names MUST clearly describe what is being tested (Given-When-Then pattern encouraged)
- Tests MUST be independent and repeatable
- Tests MUST NOT depend on external state or execution order
- Mock external dependencies (filesystem, network, time) for unit tests
- Integration tests MUST use test fixtures and clean up after themselves

**Rationale**: Tests provide safety nets for refactoring and prevent regressions. They also serve as executable documentation of system behavior. Quality trumps quantity - a few well-written tests beat many brittle ones.

### V. Code Review Standards

**All code changes must be reviewed by at least one other developer before merging.**

**Review Checklist**:
- Does code follow Clean Code First principles? (Principle I)
- Is documentation complete and professional? (Principle II)
- Are types properly used and validated? (Principle III)
- Are tests included and meaningful? (Principle IV)
- Are variable/function names clear and descriptive?
- Is error handling appropriate and user-friendly?
- Are there obvious performance issues or memory leaks?
- Does the code integrate cleanly with existing patterns?

**Review Process**:
- Reviewers MUST provide constructive feedback focused on code quality
- Authors MUST address all review comments (agree and fix, or discuss and justify)
- Approval requires explicit "LGTM" or equivalent from reviewer
- Automated checks (linting, type checking, tests) MUST pass before review

**Rationale**: Code review catches bugs, spreads knowledge, enforces standards, and improves team code quality through collective ownership. Two sets of eyes dramatically reduce defects.

## Code Quality Standards

**Tooling & Automation**:
- ESLint MUST enforce code style and catch common errors
- Prettier MUST format all code automatically (no style debates)
- TypeScript strict mode MUST be enabled (`strict: true`)
- Husky pre-commit hooks MUST run linting and formatting
- CI pipeline MUST run type checking, linting, and tests

**Code Organization**:
- Related functionality MUST be grouped into cohesive modules
- Circular dependencies are PROHIBITED (CI must detect and reject)
- Shared utilities MUST live in clearly named common directories
- Feature-specific code MUST NOT leak into unrelated modules

**Performance Considerations**:
- Premature optimization is discouraged - measure before optimizing
- Known performance bottlenecks MUST be documented with TODO and issue reference
- Obsidian plugin APIs MUST be called efficiently (batch operations when possible)
- Memory leaks MUST be prevented (proper cleanup in component lifecycle)

## Development Workflow

**Branch Strategy**:
- Feature branches MUST be created from main branch
- Branch names MUST follow pattern: `feature/description` or `fix/description`
- Branches MUST be kept up-to-date with main (rebase or merge regularly)

**Commit Standards**:
- Commit messages MUST be clear and describe the "why" not just "what"
- Commits SHOULD be atomic (one logical change per commit)
- Commit messages SHOULD follow conventional commits format when applicable

**Pull Request Process**:
1. Create PR with descriptive title and summary
2. Link related issues/specs
3. Request review from at least one team member
4. Address review comments
5. Ensure CI checks pass
6. Merge only after approval

**Testing Before Merge**:
- Developer MUST test changes in local Obsidian vault
- Reviewer SHOULD test critical changes in their environment
- Breaking changes MUST be called out explicitly

## Governance

**Constitution Authority**:
- This constitution supersedes all other development practices
- When in conflict, constitution principles take precedence
- Deviations MUST be explicitly justified in code review

**Amendment Process**:
- Amendments require team discussion and consensus
- Proposed changes MUST be documented with rationale
- Version number MUST be incremented per semantic versioning:
  - MAJOR: Backward-incompatible governance changes or principle removal
  - MINOR: New principle added or material expansion
  - PATCH: Clarifications, wording fixes, non-semantic refinements
- Migration plan MUST be provided for breaking changes

**Compliance & Enforcement**:
- All PRs and code reviews MUST verify compliance with this constitution
- Repeated violations MUST be addressed through team discussion
- Automated tooling MUST enforce what can be automated (linting, formatting, type checking)
- Complexity and technical debt MUST be explicitly justified and tracked

**Living Document**:
- Constitution MUST be reviewed quarterly for relevance
- Feedback on constitution principles is encouraged
- Updates MUST maintain or improve code quality standards

---

**Version**: 1.0.0 | **Ratified**: 2025-10-18 | **Last Amended**: 2025-10-18
