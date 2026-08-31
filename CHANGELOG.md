# Changelog

Notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-08-31

### Added

- Independently installable `favium-cli` package
- Animated WebP first-frame conversion into PNG/ICO favicon bundles
- Configurable browser bundle sizes with a size-indexed PNG map
- Browser and spawned CLI end-to-end coverage
- Cross-realm `HTMLCanvasElement` support
- CI across supported Node.js versions, Linux, macOS, and Windows

### Changed

- Moved CLI from `favium` to `favium-cli`; use `npx favium-cli`
- Made `favium` browser-only with zero runtime dependencies
- Set minimum supported CLI runtime to Node.js 22
- Reused rendered PNG buffers across PNG and ICO outputs
- Locked dependencies with Bun for reproducible CI installs

### Fixed

- Prevented partial CLI output through staged writes and rollback
- Accepted canvas instances created in another browser realm
- Rejected non-finite, oversized, and unsafe canvas dimensions
- Used first frame only for animated image inputs

### Security

- Added source byte limits, canvas dimension limits, output path validation, symlink rejection, and atomic replacement
- Patched audited transitive dependencies through lockfile overrides

## [0.1.1] - 2026-08-31

- Added initial WebP input support and non-interactive CLI argument parsing
- Tightened input validation and project linting

[0.2.0]: https://github.com/kiron0/favium/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/kiron0/favium/releases/tag/v0.1.1
