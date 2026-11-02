# Dependency security review — 10 October 2026

## Changes

- Next and eslint-config-next: 15.5.26 → 15.5.27, staying on the same minor release line.
- sharp: 0.35.4 → 0.35.5.
- Compatible transitive updates: source-map-js 1.2.2 and @modelcontextprotocol/sdk 1.32.1.
- Override PostCSS to 8.5.29. Next otherwise pins 8.4.31; refreshing only the top-level resolved PostCSS does not remove that nested affected copy.
- Move unchanged shadcn 4.21.0 from dependencies to devDependencies. The application imports only `shadcn/tailwind.css` from app/globals.css; it does not call the CLI or import its JavaScript at runtime. This package must remain available during the build. The existing Tailwind/TypeScript build already requires development dependencies.

## Exposure and remaining risk

After these changes, `npm audit --omit=dev` reports no known dependency advisories in the production-classified graph. This is an advisory-database result, not proof of no vulnerabilities or a launch/security certification.

The complete graph still reports 8 high package rollups rooted in one braces stack-exhaustion advisory (GHSA-vfj7-8cjw-p6xm). The latest registry release checked, braces 3.0.3, is still affected. Do not suppress the advisory or claim the toolchain is cleared.

The remaining path is build/code-generation/lint tooling. All 17 Next production output trace manifests were inspected after the optimized build: no shadcn, braces, micromatch, fast-glob or ts-morph files were included. No reviewed application route accepts user-supplied glob patterns. This supports a narrower runtime exposure assessment; it does not prove every possible input or hosting arrangement safe.

Mitigation until an upstream patch: build only reviewed source in an isolated CI environment, never feed untrusted user glob patterns or unreviewed generated configurations to these tools, and recheck the advisory before upgrading. Preserve source/lockfile review and do not run arbitrary untrusted dependency lifecycle scripts. Install production-only dependencies only after the build, or deploy the traced Next runtime artifacts using the hosting provider's supported flow.

## Verification

23 focused tests, TypeScript checking, lint (one pre-existing unused-disable warning) and optimized production build pass. Browser and real-database deployment checks remain separate prerequisites; see the launch review and admin-session rollout instructions.
