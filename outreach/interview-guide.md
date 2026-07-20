# Customer-Discovery Interview Guide

## Goal
Understand whether the prospect has recently felt the pain Collectly is solving. **Do not pitch. Do not demo.** Find out if late-payment follow-up is recent, painful, recurring, and owner-visible.

## Success signal
A strong prospect can immediately recall a recent overdue invoice and describe why chasing it was annoying, awkward, or costly.

## Weak signal
They say their accounting tool/bookkeeper handles it and cannot recall a recent painful late invoice.

## The 10 discovery questions
1. What was the last client invoice you had to personally chase?
2. How late was it?
3. Who followed up?
4. How many times did someone follow up?
5. What made it annoying or awkward?
6. What happens internally if nobody follows up?
7. When do you escalate from polite reminder to firmer follow-up?
8. Do you track promises to pay anywhere?
9. Are any invoices excluded because of disputes, scope issues, or relationship sensitivity?
10. What do QuickBooks/Xero reminders not handle well for you?

## Flow (15-20 min)

### 0-2 min — frame
> "This isn't a demo. I want to understand how you actually handle late invoices. 10 questions, 15 min. I'll take notes but no recording. Can I ask the first one?"

### 2-10 min — open with the recall question
> "What's the last client invoice you had to personally chase?"

If they pause or can't recall → likely weak signal. Ask Q10 to confirm:
> "What do QBO/Xero reminders not handle well for you?"

If they recall immediately → strong signal. Continue with Q2-Q5 to get the texture:
- Q2: How late was it?
- Q3: Who followed up?
- Q4: How many times did someone follow up?
- Q5: What made it annoying or awkward?

### 10-15 min — go deeper on the awkwardness
- Q6: What happens if nobody follows up?
- Q7: When do you escalate from soft to firm?
- Q8: Do you track promises to pay?
- Q9: Any invoices excluded because of disputes/scope/relationship?

### 15-20 min — close, don't pitch
> "That's really useful. Last question — what does QBO/Xero reminders not handle well for you?"

After they answer, ask:
> "Would it be helpful if I shared what I'm building and let you react? No pressure either way."

If yes → 60-second framing only, no demo. The frame is the pain hypothesis:
> "It's a tool that follows up on overdue invoices the way a thoughtful operations person would — adapting tone based on context, escalating when appropriate, keeping the founder out of the awkward parts. Promise-to-pay tracking built in."

Then ask:
> "Does that match what you'd want? Or is it solving the wrong problem?"

Stop. Don't keep selling. Their answer tells you whether the product matches the pain.

## What to listen for

| Signal | Quote examples | Notes |
|---|---|---|
| Founder chases | "I do it", "I hate sending those emails", "I have to write 4 versions" | Strongest signal |
| Forgot to follow up | "We just kind of let it go", "It slipped" | Moderate — needs nudge system |
| Awkward tone | "I have to be careful with this client", "She's a friend of the founder" | Strong signal for relationship-safe language |
| Promises not tracked | "He said he'd pay Tuesday", "It's in my head" | Strong signal for promise-to-pay feature |
| Client dispute excluded | "We don't chase that one because of the scope issue" | Strong signal for exclusion feature |
| QBO reminders ignored | "Clients just ignore them", "They sound like robots" | Strong signal for tone adaptation |
| Bookkeeper handles all | "Our bookkeeper is great, no issues" | Weak signal — pause, don't push |

## After the call

Within 24 hours, write a 1-paragraph note in `outreach/queue/interviews/<id>.md`:
- Quote they used (verbatim)
- Their answer to the recall question
- Strongest pain they surfaced
- Whether they want a follow-up
- Any product feature that would have helped

If they were a strong signal + want to keep talking → update outreach-log.csv: status = `booked_chat`, log next steps.
If they were weak signal → status = `closed`, no follow-up needed.
