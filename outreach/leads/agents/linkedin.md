# LinkedIn agent

First read `COMMON.md`. LinkedIn has no public API for searching posts, and scraping it breaks its terms and risks the
user's account, so this agent does **not** browse or scrape LinkedIn.

Input: `runs/<date>/linkedin-inbox.txt`. The user (or the lead) pastes post links, or pastes the post text, one item
per blank-line-separated block, with an optional first line `url: https://...`. For each block: write an item
(`LI-<n>`, `community: "LinkedIn"`, `createdAt` only if the paste says when, otherwise today's date) and a draft comment.
LinkedIn comments should be 2 to 4 sentences, specific to the post, no pitch. If the file is missing or empty, write `[]`
and say so. Suggested saved searches for the user to run by hand: "chasing invoices", "late paying clients",
"fractional bookkeeper" + "clients not paying", "accounts receivable" + "small business".
