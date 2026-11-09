# DevClass technical overview

This document supplements the portfolio README without replacing the existing
technical notes in `MDs/` or the pre-existing files in `docs/`.

## Domain flow

1. A teacher signs in through REST and receives a JWT.
2. Protected GraphQL operations use the teacher identity from that token.
3. The teacher selects an academic period and class, then manages students and
   enrolments.
4. Lessons hold daily records for each enrolment and skill.
5. Feedbacks can be written manually or generated one request at a time by the
   OpenAI service. Generated text remains editable.
6. A teacher explicitly marks a feedback as sent after communicating externally.

The code preserves historical records through status and archive fields rather
than exposing physical deletion as a normal domain operation.

## Attribution evidence

The portfolio branch is based on the collaborative branch
`frontend-fase-5-thayslan`. Its tip commit `aff95d4` is authored by
`thayslancosta`; the preceding history contains the earlier phases from the rest
of the team. The branch comparison is recorded in the delivery report rather than
rewriting or flattening that history.