#!/usr/bin/env python3
"""Reply triage + follow-up drafter for Collectly outreach.

When a prospect replies, classify the response by signal type and draft
a personalized follow-up. The follow-up is one question, contextual to
their answer. Never pitches.

Signals:
  - positive (founder chased, recall recent painful invoice): success signal
  - warm (someone else owns it, but they feel the pain): warm signal
  - weak (bookkeeper handles it, no recall): low priority
  - negative (not interested, wrong person, unsubscribe): close politely

Usage:
  python3 triage_reply.py --email "..." --reply "..." --id P001
"""
import argparse, json, re
from datetime import datetime

POSITIVE_PATTERNS = [
    r'\bme\b', r'\bmyself\b', r'\bi do\b', r'\bi chase\b', r'\bi send\b',
    r'\bmy job\b', r'\bforgetful\b', r'\bawkward\b', r'\bannoying\b',
    r'\bclient paid late\b', r'\b40 days\b', r'\b60 days\b', r'\b90 days\b',
    r'\bnet 30\b', r'\bnet 60\b', r'\blate\b', r'\boverdue\b',
    r'\bproject lead\b', r'\baccount lead\b', r'\baccount manager\b',
    r'\bcreative director\b', r'\baccount director\b', r'\boperations\b',
    r'\bwe forget\b', r'\bi forget\b', r'\bwe chase\b', r'\bwe send\b',
    r'\bbill later\b', r'\bcan we pay next week\b', r'\bpromise to pay\b',
]
WEAK_PATTERNS = [
    r'\bbookkeeper\b', r'\baccountant\b', r'\bXero handles\b',
    r'\bQuickBooks handles\b', r'\bQBO handles\b', r'\bno issues\b',
    r'\bno problem\b', r'\bautomated\b', r'\bauto[- ]?remind',
    r'\bdon.?t have this problem\b', r'\bnot really\b', r'\bnope\b',
]
NEGATIVE_PATTERNS = [
    r'\bunsubscribe\b', r'\bremove me\b', r'\bnot interested\b',
    r'\bstop (?:emailing|contacting)\b', r'\bno thanks\b', r'\bdon.?t contact\b',
    r'\bleave me alone\b', r'\bwrong person\b',
]

FOLLOWUPS = {
    'positive_founder': (
        "Thanks — that's exactly what I'm trying to understand. "
        "Is it mainly because nobody else owns it, or because the wording/tone is sensitive? "
        "Trying to figure out which part is the bigger blocker for a tool like Collectly."
    ),
    'positive_lead': (
        "Makes sense. Do project leads actually follow up consistently, or does it slip because they're protecting the client relationship? "
        "And does anything escalate to the founder when it goes past 30/60 days, or does it just sit there?"
    ),
    'positive_billing': (
        "Got it. Does billing own the whole follow-up, or do founders/account leads get pulled in when it gets awkward? "
        "Curious how that handoff works (or doesn't) at smaller shops."
    ),
    'weak_no_clear_owner': (
        "That's actually really useful — \"no clear owner\" is the case I hear most. "
        "Is the bigger problem forgetting, discomfort, or not knowing when to escalate from soft to firm?"
    ),
    'weak_automated': (
        "Good to hear. One thing I keep running into: QBO/Xero reminders tend to sound robotic, and clients ignore them until someone pushes. "
        "Have you seen that at all, or has it not been a problem?"
    ),
    'wrong_person': (
        "Totally fair. If it's easier, can you forward this to whoever handles billing/AR, or drop their email and I'll reach out directly? "
        "Appreciate the redirect either way."
    ),
    'unsubscribe': (
        "Got it — won't email again. Sorry for the noise. Wishing you a great quarter. — David"
    ),
}


def classify(reply_text, has_email_subject=True):
    text = reply_text.lower()
    is_negative = any(re.search(p, text) for p in NEGATIVE_PATTERNS)
    if is_negative:
        if re.search(r'\bunsubscribe\b', text) or re.search(r'\bremove me\b', text):
            return 'unsubscribe', FOLLOWUPS['unsubscribe']
        if re.search(r'\bwrong person\b', text):
            return 'wrong_person', FOLLOWUPS['wrong_person']
        return 'not_interested', "Thanks for the reply — totally get it. Wishing you a great quarter. — David"

    is_weak = any(re.search(p, text) for p in WEAK_PATTERNS)
    is_positive = any(re.search(p, text) for p in POSITIVE_PATTERNS)

    if is_positive and not is_weak:
        # Determine sub-signal
        if re.search(r'\bme\b|\bmyself\b|\bi do\b|\bi chase\b|\bi send\b|\bi forget\b', text):
            return 'positive_founder', FOLLOWUPS['positive_founder']
        if re.search(r'\bproject lead\b|\baccount lead\b|\baccount manager\b|\baccount director\b|\bcreative director\b', text):
            return 'positive_lead', FOLLOWUPS['positive_lead']
        if re.search(r'\bbilling\b|\boperations\b|\bfinance\b|\bops\b', text):
            return 'positive_billing', FOLLOWUPS['positive_billing']
        return 'positive_general', FOLLOWUPS['positive_founder']
    if is_weak and not is_positive:
        if re.search(r'\bautomated\b|\bauto[- ]?remind\b|\bXero handles\b|\bQBO handles\b|\bQuickBooks handles\b', text):
            return 'weak_automated', FOLLOWUPS['weak_automated']
        return 'weak_other', FOLLOWUPS['weak_automated']

    if re.search(r'\bno clear owner\b|\bnobody\b|\bno one\b', text):
        return 'weak_no_clear_owner', FOLLOWUPS['weak_no_clear_owner']

    # Default: assume positive (someone engaged enough to reply)
    return 'unclear', (
        "Thanks for the reply. To be useful here, I'd need to know: who actually chases the invoice at {{company}} — "
        "you, the project lead, or whoever handles billing? Trying to figure out where the awkwardness sits."
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--email', required=True)
    ap.add_argument('--reply', required=True)
    args = ap.parse_args()

    signal, followup = classify(args.reply)
    out = {
        'id': args.id,
        'email': args.email,
        'signal': signal,
        'followup_draft': followup,
        'classified_at': datetime.utcnow().isoformat() + 'Z',
    }
    print(json.dumps(out, indent=2))


if __name__ == '__main__':
    main()
