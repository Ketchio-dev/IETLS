# Review — Full IELTS Module Registry Placeholder Slice

## Scope
Extend the shared assessment-module seam from Writing + Speaking to all four IELTS Academic skills by registering Reading and Listening as lightweight placeholder modules.

## Goals
- preserve Writing as the default working route
- keep Speaking alpha intact
- prove the registry/workspace can carry all four IELTS Academic skills
- avoid fake Reading/Listening scoring before the content pipelines exist

## Implemented shape
- `reading` and `listening` are now registered modules
- both expose placeholder practice/dashboard pages
- both expose placeholder task and assessment APIs
- the placeholder assessment APIs intentionally return `501` with explicit guidance

## Guardrails
- no new dependencies
- no fake score reports for Reading/Listening
- no claim of content readiness before passage/script QA exists
- keep future slices free to replace the placeholder service with real module services
