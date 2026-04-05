# Logging Levels (`LOG_LEVEL`)

`LOG_LEVEL` controls how much runtime information is printed in the console.

Allowed values:

- `silent`
- `error`
- `warn`
- `info`
- `debug`

Fallback behavior:

- If `LOG_LEVEL` is missing or invalid and `NODE_ENV=production`, the app uses `info`.
- If `LOG_LEVEL` is missing or invalid in non-production, the app uses `debug`.

## What each level shows

`silent`
- No logs at all.

`error`
- Only failures that stop or break a flow.
- Example: image generation failures (`ComfyUI generation error`), seed script crashes.

`warn`
- `error` + recoverable problems.
- Example: prompt enhancement/translation failures where the request still continues with fallback behavior.

`info`
- `warn` + minimal operational logs for healthy flow tracking.
- Example: start/end of image generation, main seed script progress.

`debug`
- `info` + detailed diagnostic logs.
- Example: input prompt, resolved context prompt, enhanced/translated prompt, feature flags and settings used in processing.

## Recommended usage

- Development: `LOG_LEVEL=debug`
- Production (balanced): `LOG_LEVEL=info`
- Production (very quiet): `LOG_LEVEL=warn` or `LOG_LEVEL=error`
- Absolute silence: `LOG_LEVEL=silent`
