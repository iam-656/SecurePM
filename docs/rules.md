# RULES

# Plan
1. Whenever task is assigned to you, create the implementation plan first in the docs/plans/ folder in markdown file format. The filename must match the plan ID. Example: docs/plans/plan_01.md

# Implementation
1. The code should be as simple as possible, don't need to be complex or over-engineered without any reason.
2. Each component should be coded in a separate file rather than piling them up in a single file.
3. Don't go beyond the scope of the MVP unless explicitly asked to do so.
4. Whatever the endpoint you create, you have to document it in the docs/endpoints.md file in markdown file format.
5. Prohibit hardcoding API keys, logging passwords or sensitive tokens, and bypassing authorization checks.
6. Error Handling: Fail loudly on missing configurations and return generic, safe messages for authentication or exception errors.  
7. You may try a maximum of 3 times to fix any specific error or failing test. Always prefix your fix with `[ATTEMPT X/3]`. If Attempt 3 fails, STOP immediately. Do not guess or try again. Output a brief summary of the 3 attempts, the root blocker, and request human intervention.
8. After done coding everytime, build and test commands should be run to verify your own work.

# Maintainance
1. Whenever I report any error to you, you have to document it in the docs/errors/ folder in markdown file format. The filename must match the error ID. Example: docs/errors/error_01.md. After that you can fix it and update the error file by adding how the error was fixed and what changes were made at the end of the file.