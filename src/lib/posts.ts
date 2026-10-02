type Post = { slug: string; title: string; date: string; read: string; excerpt: string; body: string; tags: string[]; };

export const POSTS: Post[] = [
  {
    slug: 'bookkeeper-invoice-follow-up-service',
    title: 'How a bookkeeper can offer invoice follow-up as a paid service',
    date: '2026-10-03', read: '6 min',
    excerpt: 'Many clients have overdue invoices and nobody chasing them. Here is how to scope it, price it and run it as a service, without becoming a collections agency.',
    tags: ['bookkeeping', 'QuickBooks', 'accounts receivable', 'client services'],
    body: `Ask a few of your clients who follows up when an invoice goes overdue, and a common answer is "nobody, really." The owner is busy, the invoice sits, and the cash they were counting on arrives a month late. You already see those invoices every time you reconcile. Following up on them is a natural thing to offer.

It is also easy to do badly: scope creep, awkward conversations with your client's customers, and a pile of unpaid hours. This is a way to set it up so it stays a clean service.

## Decide what you are actually offering

There is a wide gap between "I will send reminders" and "I will collect your debts." Pick the narrow end and say so in writing.

A reasonable scope for a bookkeeper:

- You draft and send polite payment reminders on the client's behalf, on a schedule you agree up front.
- You report each month on what is overdue, what was paid after a reminder, and what needs the owner's attention.
- You flag disputes and send them to the owner. You do not argue them.

What stays out of scope: threats, legal letters, calls to a customer who has stopped replying, anything about credit reporting. If it gets that far, it goes back to the owner, who can decide whether to involve a collections firm or a lawyer. This is not legal advice, and the rules on contacting debtors vary by place, so check yours.

## Get three things agreed before you send anything

1. **Whose name is on the email.** Reminders land better from the client's business name than from a bookkeeper nobody has heard of. Agree on the sender name and, if you can, the address.
2. **Who approves.** For the first month, have the owner see every message. After that, agree which customers or amounts you can handle yourself. Keep a record of the agreement.
3. **What counts as "stop."** A customer who replies, a customer who disputes, a customer the owner calls a friend: decide in advance that any of these pauses the chase until a person has looked.

## Pricing it

There are a few common ways to charge. None is right for everyone.

- **A flat monthly fee per client.** Predictable for both sides, and easy to explain. The risk is a client with a lot of overdue invoices turning a cheap fee into a lot of work.
- **A fee tied to volume,** such as the number of customers followed up. Fairer when clients vary a lot, but harder to quote.
- **A share of what is recovered.** It sounds appealing, but it blurs the line toward collections and invites arguments over what would have been paid anyway. Think hard before offering it.

Whatever you choose, put the scope and the price in the engagement letter. The reminders themselves cost little. The hours go on setup, on the monthly report and on the conversations with the owner.

## A weekly rhythm that fits around the rest of your work

A short, fixed routine is easier to sustain than ad hoc chasing.

1. **Monday:** open the aged receivables report for each client. Our [guide to reading one](/blog/read-an-aged-receivables-report) covers what to look for.
2. **Review the reminders due this week** and edit anything that does not sound like the client.
3. **Send,** then note the replies. A reply that says "I'll pay Friday" is worth writing down, and following up if Friday passes.
4. **Once a month,** send the owner a one-page summary: overdue total, what moved, and the two or three accounts that need a personal call.

One reminder per customer per week, listing everything they owe, is kinder and clearer than three separate emails about three invoices.

## Do not let the accounting software send them for you

If your clients are on QuickBooks, be careful about turning on its built-in reminders without the owner knowing. Plenty of owners have been surprised to learn their customers were emailed on their behalf. We wrote about [why that happens and how to stop it](/blog/stop-quickbooks-emailing-your-customers). The point of this service is that a person chose to send each message.

## Where a tool helps

You can run all of this with a spreadsheet and your own email. It stops scaling at around a handful of clients. At that point you want one place that shows every client's overdue invoices and holds the drafted reminders until you approve them.

That is what [Mugavi](/for/bookkeepers) is built for. It drafts reminders for each client book from QuickBooks, waits for your approval, and gives you thirty seconds to undo after you press send. A customer who holds a credit that covers what they owe is not chased, and a reply pauses the chase. It is $399 a month for ten client books. The QuickBooks integration is in beta, so start with one client book and check what it shows before you add more. And it does not write late fees back to QuickBooks yet.

## A short checklist before you offer this

- [ ] Scope written down, including what you will not do
- [ ] Sender name and address agreed with each client
- [ ] An approval rule agreed, and what pauses a chase
- [ ] Price and what it covers in the engagement letter
- [ ] A monthly one-page summary you can reuse for every client
- [ ] A place to look up the rules on contacting debtors where you work

Start with one client who already complains about late payers. Run it for a month, see how many hours it really takes, and price the service from that.`,
  },
  {
    slug: 'payment-reminder-emails-bookkeepers-send-for-clients',
    title: "Payment reminder emails you can send on a client's behalf (4 templates)",
    date: '2026-10-03', read: '6 min',
    excerpt: "Four copy-ready emails for a bookkeeper chasing a client's late invoices: a heads-up, a due-date note, a first overdue reminder and a firm one. With rules for when to send each.",
    tags: ['bookkeepers', 'templates', 'QuickBooks', 'invoice reminders'],
    body: `When a client asks you to chase their late invoices, the hard part is rarely the chasing. It is the wording. You are writing in someone else's name, to someone else's customer, about money. Get the tone wrong and the client calls you angry. Say nothing and the invoice ages.

Below is a set of four emails you can copy, with the rules for when each one goes out. Everything in square brackets is a blank to fill in. Nothing here needs special software. You can keep the set in a document or in QuickBooks Online's own reminder settings.

## Before you send anything

Get these four things from the client in writing. It takes one email, and it saves you an awkward call later.

- **Who the emails come from.** Your name, the client's name, or a shared accounts address. Pick one and keep it the same for every customer.
- **Which customers are off limits.** Some clients have a customer they do not want chased at all, such as a relative or their biggest account. Ask.
- **When to stop and call.** Agree the day when you stop emailing and hand the invoice back to the client.
- **Whether you can change terms.** Do not offer payment plans or write-offs yourself. Those are the client's call.

If you send as the client, use their business name in the signature. If you send as yourself, say whose invoice it is in the first line. Customers ignore emails from someone they have never heard of, so name the client early.

## Email 1: the heads-up, a few days before the due date

Send this three to five days before the due date. It is not a chase. It is a courtesy, and it never calls the invoice late.

**Subject:** Invoice [invoice number] from [client business] is due on [due date]

Hi [customer first name],

A quick note that invoice [invoice number] for [amount] is due on [due date]. You can pay it here: [payment link or bank details].

If anything on the invoice looks wrong, reply to this email and we will sort it out before the due date.

Thanks,
[your name], for [client business]

Why bother? Some late payments are simply invoices that sat unread in an inbox. A short note with the amount and the way to pay removes that excuse.

## Email 2: the due-date email

Send this on the due date, or the morning after. Keep it light.

**Subject:** Invoice [invoice number] is due today

Hi [customer first name],

Invoice [invoice number] for [amount] is due today. Payment details are below.

[payment link or bank details]

If you have already paid, thank you, and please ignore this. If you need anything else from us to pay it, such as a purchase order number, tell me and I will send it.

Thanks,
[your name], for [client business]

The purchase order line matters more than it looks. Invoices often stall in a customer's accounts payable team because a reference is missing, not because anyone refuses to pay.

## Email 3: first overdue

Send this seven days after the due date. It names the problem plainly and asks a question, which is easier to answer than a demand.

**Subject:** Invoice [invoice number] is [number] days overdue

Hi [customer first name],

Our records show invoice [invoice number] for [amount] was due on [due date] and has not been paid yet. Could you let me know when we can expect it?

If it has gone out already, tell me the date and I will match it up on our side. If there is a problem with the invoice, tell me what it is and I will pass it to [client first name] today.

Pay online: [payment link or bank details]

Thanks,
[your name], for [client business]

There are two ways out of this email: "I paid" and "there is a problem." Both get you a reply. A reply is what you are after, because a customer who answers is much easier to move than one who stays silent.

## Email 4: the firm one

Send this fourteen to twenty-one days after the due date, or on the day you agreed with the client. Stay calm and factual. State what you need and by when. Do not threaten anything the client has not approved.

**Subject:** Action needed: invoice [invoice number], [amount], [number] days overdue

Hi [customer first name],

Invoice [invoice number] for [amount] was due on [due date] and is now [number] days overdue. We have written before and have not had a reply.

Please pay by [date], or reply by then with a date you can commit to. Payment details: [payment link or bank details].

If we do not hear from you by [date], [client first name] will contact you directly about the account. [Add a line here about pausing work or supply only if the client has told you to.]

Thanks,
[your name], for [client business]

For more on this last step, including how to word a final notice, see our post on [writing a final notice that gets paid](/blog/final-notice-that-gets-paid-2026).

## A short checklist for every send

- Check the invoice is still unpaid in the books right now, not from last week's report.
- Check the customer has no open dispute or promise to pay noted anywhere.
- Check the amount and the due date match the invoice, not a memory of it.
- Check the email goes to the person who pays, not only the person who ordered.
- Write down the date you sent it, so the next step is not a guess.

## Mistakes that cause the angry client call

- Chasing an invoice the client already settled by cash or cheque that you have not recorded yet.
- Sending a firm email to a customer who replied to the last one and was waiting on an answer from you.
- Sending the same email to a customer with three overdue invoices, three times in one week. One message that covers everything reads better than three separate ones.
- Using a tone the client would never use. If the client is warm and chatty, soften the wording above.

## If you run this for ten or more clients

The set above works for one client. At ten clients the problem changes. You are tracking ten lists of customers, ten schedules and ten opinions about tone. A spreadsheet and a calendar reminder will carry you until a busy week breaks it. If you are building this into a paid service, our page for [bookkeepers](/for/bookkeepers) covers how we think about it.

Mugavi drafts reminders like these for QuickBooks and Xero and holds each one until the owner approves it, so nothing goes to a client's customer unseen. The QuickBooks connection is in beta, late fees are not written back to QuickBooks, and there is no read-only team role yet. Whichever way you do it, keep the wording above and change only the blanks.`,
  },
  {
    slug: 'customer-says-never-got-invoice-or-disputes-it',
    title: "A client's customer says they never got the invoice, or disputes it. What to do.",
    date: '2026-10-03', read: '6 min',
    excerpt: "Two different problems with two short processes: the invoice that never arrived, and the invoice the customer says is wrong. Includes wording you can copy.",
    tags: ['bookkeepers', 'disputes', 'QuickBooks', 'collections'],
    body: `Sooner or later a client's customer will say one of two things. "I never got that invoice." Or "I am not paying that, it is wrong." Both stop a payment, and both are often handled badly because the person chasing is guessing. This post gives you a short process for each, and wording you can copy.

The rule underneath all of it: do not argue about who is right until you have the facts. Often the customer is neither lying nor careless. The invoice went to the wrong person, or the job was not what they expected.

## When the customer says they never got the invoice

### Step 1: Check where it went

Before replying, look at what the books show.

- **The email address on the customer record.** A typo, an old address, or a person who has left the company are the usual causes.
- **Whether the invoice was marked as sent.** In QuickBooks Online an invoice can be saved but never emailed. In Xero it can sit as approved and never sent. Both look fine at a quick glance.
- **Whether anyone else should have received it.** Many businesses want the invoice sent to an accounts payable address, not to the person who placed the order.

If you can see the email went out, say so politely, with the date. Do not say it as a gotcha.

### Step 2: Resend it, and ask where it should go

Send it again straight away. Do not wait for the question of fault to resolve. The goal is to get the invoice in front of the right person, not to prove it was sent.

**Subject:** Invoice [invoice number] from [client business], resent

Hi [customer first name],

Thanks for letting me know. I have attached invoice [invoice number] for [amount], dated [invoice date], due [due date]. Payment details are below.

[payment link or bank details]

Could you tell me the best email address for invoices at [customer business]? I will update our records so future ones reach the right person.

Thanks,
[your name], for [client business]

### Step 3: Decide about the due date, with the client

If the customer genuinely never received it, ask the client whether to move the due date. Some clients will hold to the original terms. Others will give a few days. That is their decision, not yours. Whatever they decide, write it down and tell the customer the date plainly.

### Step 4: Fix the cause

Update the email address in the books. Add the accounts payable contact if there is one. If the invoice was never sent, tell the client so they can catch it next time. This step is the one that stops the same call happening again.

## When the customer disputes the invoice

A dispute is a different thing. The customer has the invoice and says it is wrong. Treat it as a question to answer, not a refusal to resist.

### Step 1: Pause the chasing

Stop all reminders on that invoice at once. Nothing makes a dispute worse than a firm "overdue" email arriving the day after the customer explained their problem. If your reminders run automatically, this is the first thing to switch off.

### Step 2: Find out exactly what is disputed

Customers often dispute part of an invoice, not all of it. Ask for specifics.

**Subject:** Re: Invoice [invoice number]

Hi [customer first name],

Thanks for telling me. I have paused any reminders on this invoice while we look at it.

Could you tell me which part is the problem? For example, the amount, a line item, the quantity, or the date of the work. If you have a purchase order or a quote that shows something different, please send it.

I will take it to [client first name] and come back to you by [date].

Thanks,
[your name], for [client business]

Notice what this email does not do. It does not agree the customer is right. It does not say they are wrong. It promises a reply on a date, and you must keep that date.

### Step 3: Take it to the client with the facts

Send the client a short note, not a forwarded argument.

- The invoice number, amount and date.
- What the customer says is wrong, in the customer's words.
- What the books show.
- What you suggest: stand by it, issue a credit note, or correct and reissue.

The client decides. You record what they decided.

### Step 4: Ask for the undisputed part

If only one line is disputed, ask the customer to pay the rest now. It keeps cash moving and shows good faith. Some clients will want a credit note for the disputed line and a fresh invoice for the remainder. Do whatever the client agrees to, and keep the paperwork in the books.

### Step 5: Close it clearly

When it is settled, tell the customer in one line.

**Subject:** Invoice [invoice number] resolved

Hi [customer first name],

Thanks for your patience. Following our conversation, [client business] has [issued a credit note for [amount] / confirmed the invoice stands / sent a corrected invoice, number [new invoice number]]. The amount now due is [amount], by [date].

Payment details: [payment link or bank details]

Thanks,
[your name], for [client business]

## What to write down

For every dispute, keep a short log in the customer's record or your own notes.

- The date the customer raised it, and how.
- What they said was wrong.
- What you checked.
- What the client decided, and the date.
- The date reminders were paused, and the date they restarted.

This is not paperwork for its own sake. If the same customer disputes the next invoice, you will want to know what happened last time.

## What not to do

- Do not send a late fee notice while a dispute is open. Whether a fee is fair is the client's call and depends on their contract.
- Do not promise a credit note yourself. Only the client can agree to give up money.
- Do not tell the customer they are wrong based on the books alone. The books can be wrong too.
- Do not let a dispute sit. Set a date and keep it. Silence is how a small dispute turns into a lost customer and a write-off.

## Before the next one

Many of these calls trace back to the same few causes: the wrong email address, a missing purchase order number, and invoices that did not match what was agreed. A short check for each client at the start, covering who receives invoices and whether customers need a purchase order, removes a lot of them. Our page for [bookkeepers](/for/bookkeepers) describes how we think about running that across many books.

If you would rather a customer did not have to write an email to dispute something, a payment page with a "something is not right" button gives them another way. Mugavi has one: pressing it stops reminders and tells the owner. It has not been tested with a real customer yet. The QuickBooks connection is in beta, late fees are not written back to QuickBooks, and there is no read-only team role. Even without any tool, the process above holds.

For wording on the gentler end of the same problem, see [the dunning templates post](/blog/best-dunning-templates-2026).`,
  },
  {
    slug: 'onboard-client-to-invoice-follow-up-first-week',
    title: "How to onboard a client to invoice follow-up in the first week",
    date: '2026-10-03', read: '6 min',
    excerpt: "A day-by-day checklist for the first week of an A/R follow-up service: access, customer list clean-up, the call with the client, the schedule, a dry run and the first report.",
    tags: ['bookkeepers', 'onboarding', 'checklist', 'QuickBooks'],
    body: `You have agreed to follow up on a client's unpaid invoices. The contract is signed and the client is waiting. The first week decides whether this becomes a service they thank you for, or one they quietly cancel because a reminder went to the wrong person.

This is a checklist for that first week, day by day, with the questions to ask and the things to write down. It works whether you send the reminders yourself or use software to draft them.

## Before day one: what you are agreeing to

Settle these in the contract or a short email, not in a phone call you will forget.

- **What you will do.** Send reminders, answer replies, and report. Say whether you will phone customers.
- **What you will not do.** Offer payment plans, write off balances, charge fees, or start legal action. Those stay with the client.
- **How you are paid.** A monthly fee for the service is simpler to explain than a cut of what you collect.
- **How you will report.** One short message a week is plenty to start with.

If a client says chasing is not what they hired a bookkeeper for, that is fine. You are selling follow-up as a defined service, and defined means they know exactly what they are buying.

## Day 1: get access and read the books

- Get your own login to the client's QuickBooks Online or Xero. Do not use the client's password. A named login for you is safer for both sides.
- Check what role you were given and what it lets you see. If the client only wanted to share part of the books, find out now.
- Run the aged receivables report. In QuickBooks it is the A/R Aging Summary. In Xero it is Aged Receivables Summary. Save a copy with today's date. This is your starting point, and you will compare against it in a month.
- Note the oldest overdue invoices and the five largest balances.

## Day 2: clean the customer list

Bad data causes most of the embarrassing emails. Spend time here.

- **Missing emails.** Make a list of customers who owe money and have no email address. You cannot remind them until you have one.
- **Wrong contacts.** Check that the email on each large customer is the person who pays, not the person who ordered.
- **Duplicates.** The same customer entered twice splits their balance and means two reminders for one debt.
- **Credits and unapplied payments.** If a customer has a credit memo or a payment that was never matched to an invoice, they may owe nothing. Apply it first. Chasing someone who has already paid is the quickest way to lose a client's trust.

Send the client the list of missing contacts and ask them to fill the gaps by day 4.

## Day 3: have the conversation about customers

This is a fifteen-minute call with the client. Go through the top overdue customers one by one and ask:

- Is there anything I should know about this customer?
- Is there a dispute, a promise to pay, or a favour involved?
- Would you rather I did not email this one at all?
- Who should the reminders come from, and in what tone?

Write the answers down in the customer's record. Put the do-not-chase names in a list you can check before every send.

Ask one more thing: "If a customer replies angry, what do you want me to do?" The answer is often "tell me and I will call them," and now you know.

## Day 4: choose the schedule and write the wording

Keep the first schedule simple. A reasonable pattern is a heads-up before the due date, a reminder on the due date, a first overdue reminder a week later, and a firmer one two weeks after that. Our post on [the dunning templates](/blog/best-dunning-templates-2026) has wording you can start from, and you can change it to match the client's voice.

Agree with the client:

- The days each reminder goes out.
- The sender name and reply address.
- The minimum balance below which you do not chase.
- The day you stop emailing and hand the invoice back to the client.

Different customers may need different schedules. A large long-standing customer should not get the same sequence as a new one with a small balance. Two or three groups are enough to start.

## Day 5: do a dry run before anything goes out

Draft the first round of reminders and have the client read every one. This is the single most useful thing in the week.

- Send the first few to yourself or to the client so you can see how they look.
- Check amounts, invoice numbers, due dates and payment links.
- Check each one against the do-not-chase list.
- Ask the client to approve the first batch in writing, even if it is a one-line reply.

Do not start with a full backlog. Invoices that are months overdue need a different message than one that is three days late. Handle the old ones by hand with the client, and let the schedule take the newer ones.

## Day 6 and 7: send, watch, and report

- Send the approved batch. Note the date.
- Check for replies the same day and the next. Answer each one, or pass it to the client with a short summary.
- Pause reminders on any invoice where the customer replied and is waiting on someone.
- Write the first weekly report.

Keep the first report short:

- How many customers were contacted.
- Which replied, and what they said.
- Which invoices were paid since day 1.
- Anything you need from the client.

Compare the aged receivables report to the copy you saved on day 1. Report the real change in numbers, even if it is small. A modest honest result is better than a promise you cannot keep.

## The first-week checklist

- Own login to the books, role confirmed.
- Aged receivables report saved and dated.
- Customers with no email listed and sent to the client.
- Duplicates, credits and unapplied payments checked.
- Do-not-chase list written.
- Schedule, sender and stop day agreed in writing.
- First batch drafted and approved by the client.
- First weekly report sent.

## Running this across many clients

Do this once and it is a job. Do it for ten clients and you need a repeatable version: the same checklist and the same questions each time, with only the customer notes changing. Write your version down once and reuse it. Our page for [bookkeepers](/for/bookkeepers) covers how we think about running follow-up across many books.

If you want software for the drafting step, Mugavi drafts reminders for what is already overdue in QuickBooks or Xero and sends nothing until the owner approves it, with a 30-second hold after approval. The QuickBooks connection is in beta, late fees are not written back to QuickBooks, and there is no read-only team role for a helper yet. A spreadsheet and your own email work for a handful of clients.`,
  },
  {
    slug: 'why-hasnt-my-invoice-reminder-gone-out',
    title: "Why hasn't my invoice reminder gone out? Ten things to check",
    date: '2026-10-02', read: '5 min',
    excerpt: 'You set up automatic reminders and a customer is still late. Most of the time one of ten ordinary reasons is the cause. Here is how to check each one.',
    tags: ['invoice reminders', 'Xero', 'QuickBooks', 'A/R automation'],
    body: `You turned on automatic reminders, an invoice is two weeks late, and nothing has gone out. Or the customer says they never got anything. It is a common problem, and it is almost never a bug. Usually one of the ordinary rules below is quietly stopping the email.

Work down the list. The first few cause most of the trouble.

## The invoice itself

- **It is still a draft.** Reminder tools only act on invoices that have been approved or sent. In Xero that means the Awaiting Payment tab, not Draft. Check where the invoice actually sits.
- **It is already marked paid.** If someone recorded a payment, even a part payment, the tool may treat the invoice as settled or send a different message. Look at the amount due, not just the status.
- **It is not late yet.** Many schedules start a few days after the due date, and some send a reminder before it. A reminder set for day 7 will not fire on day 5.
- **The balance is too small.** Some tools skip invoices below an amount you set. If you set that years ago and forgot, small invoices never get chased.

## The customer

- **There is no email address.** This is the most common cause. The contact exists, the invoice exists, and there is nowhere to send it. Look for the contact with a blank email field.
- **They unsubscribed or the address bounced.** After either, a decent tool stops emailing them. You may never have been told.
- **You paused them.** If you told someone you would call them, you may also have switched their reminders off and forgotten.
- **They replied.** Some tools stop reminding an invoice once the customer answers, until you have read the reply. That is a good rule, but it surprises people.

## The tool's own rules

- **One reminder per customer, not per invoice.** A customer with three overdue invoices may get one email, then nothing for a week. If a tool does this, the other two invoices are waiting out the gap, not forgotten.
- **Sending hours.** If the tool only sends on weekdays between set hours, an invoice that falls due on Saturday waits until Monday.

## And then check the spam folder

If the email did go out, the customer may not have seen it. Ask them to look in spam and promotions, and send a test to your own address. A reminder from an address your customer has never seen is easy to miss.

## Where Xero and QuickBooks fit

Xero has its own invoice reminders, and the invoices page shows whether they are on or off. QuickBooks Online has reminder settings too, under Account and settings, then Sales. We have not walked through every screen in both, and they change, so check the steps in your own account. What both do well is the basics. What neither does well is tell you why a particular invoice has not been reminded.

That last part is the real problem. Ten possible reasons, and the tool shows you none of them.

## Disclosure

This article is from Mugavi, which makes accounts receivable software. In Mugavi, every invoice has a panel that answers "Why hasn't a reminder gone out?" in plain words, using the same rules the sender uses, and the invoice list has a Next reminder column that says what happens next and when. We wrote this list because the question comes up often, and every check above works without our product.`,
  },
  {
    slug: 'read-an-aged-receivables-report',
    title: 'How to read an aged receivables report, column by column',
    date: '2026-10-02', read: '5 min',
    excerpt: 'The report shows who owes you and how late. The columns are simple. What to do about each one is the part nobody explains.',
    tags: ['aged receivables', 'Xero', 'QuickBooks', 'bookkeeping'],
    body: `An aged receivables report lists what your customers owe, grouped by how overdue it is. If you only look at one report about money you are owed, make it this one.

## Where to find it

In Xero it is under Reporting, called Aged Receivables Summary (there is a Detail version too). In QuickBooks Online it is under Reports, called A/R Aging Summary. Menu names move around, so search for "aged" or "aging" if you do not see them.

## The columns

Most versions use the same five buckets:

- Current, or not yet due
- 1 to 30 days overdue
- 31 to 60 days
- 61 to 90 days
- Over 90 days

Each customer gets a row, and each bucket shows how much of their balance falls there. The right hand column is the total.

## What to do about each one

**Current.** Nothing, mostly. This is money that is behaving. If a large invoice is about to fall due, a short heads-up a few days before often saves a late payment.

**1 to 30 days.** Send a reminder. This is the cheapest bucket to fix, because the customer usually forgot or the invoice got lost. A friendly note works better than a firm one at this stage.

**31 to 60 days.** Someone should speak to them. If a reminder email did not work by now, the problem is probably not forgetfulness. Ask whether there is a dispute, a wrong purchase order number, or a cash problem.

**61 to 90 days.** Treat it as a conversation about a plan. A payment date you both agree on beats a stern email. Write it down.

**Over 90 days.** Decide, do not drift. Either there is an agreed plan, or you stop work for that customer, or you consider writing it off or passing it on. The one thing not to do is leave it in the report for another quarter.

## Three habits that make the report useful

1. Look at the total in the 61 days and over columns every month. If it grows, the problem is in your follow up, not your customers.
2. Look for one customer carrying a large share of the overdue amount. One late payer matters more than ten small ones.
3. Compare the report with what you actually chase. If a customer is in the 31 to 60 column and nobody has contacted them, that is the gap.

## Disclosure

This article is from Mugavi, which makes accounts receivable software. Mugavi has an aged receivables report with the same five buckets, shows it per customer, and exports it as a CSV. It matches the buckets above, and a customer's statement uses the same rules, so the two never disagree. Everything in this article works with the report your accounting software already has.`,
  },
  {
    slug: 'late-payment-fees-when-to-charge',
    title: 'When to charge late payment fees without losing the customer',
    date: '2026-10-02', read: '6 min',
    excerpt: 'A late fee only works if you are allowed to charge it and you actually apply it. A short guide to both, including the UK rules.',
    tags: ['late fees', 'late payment', 'invoicing', 'UK'],
    body: `Late payment fees divide small business owners. Some think they are the only thing that gets slow payers moving. Others will not charge one because they are afraid of the argument. Both views have something to them.

This is general information, not legal advice. The rules depend on where you and your customer are, so check your own contract and local law.

## You can only charge what you agreed to

In most places, a late fee needs a basis. Usually that is a clause in your contract or terms that the customer accepted before the work started. A fee you add after the invoice is late, with no earlier mention, is the kind that gets disputed and rarely collected.

So the first step is not an invoice line. It is a sentence in your terms of business, in plain words, such as the amount, when it starts, and whether it repeats.

## The UK has statutory rights

If you are a business selling to another business in the UK, the Late Payment of Commercial Debts (Interest) Act gives you a right to statutory interest and a fixed sum for each late invoice, even if your contract is silent. The interest is set at a rate above the Bank of England base rate, and the fixed sums depend on the size of the debt. We are not going to quote current figures here because they change, so look them up on the government website before you rely on them.

Outside the UK, other countries have their own rules, and in the United States it mostly comes down to your contract and state law.

## How to charge a fee without losing the customer

- **Say it early.** Put the fee in your terms and on your invoices, so it is never a surprise.
- **Give a short grace period.** A fee on day one feels like a trap. A fee after two weeks feels fair.
- **Send a reminder first.** Many customers pay after the reminder and the fee never comes up.
- **Be willing to waive it.** A long standing customer who is a week late once should hear from you, not receive a penalty. Waiving a fee in return for payment today is a fair trade, and it works.
- **Keep it proportionate.** A fee that is large compared with the invoice looks like a punishment and invites a dispute.
- **Put it on its own line.** Do not bury a fee inside the invoice total. A separate line on the statement keeps the original invoice clean.

## What not to do

Do not add a fee to an invoice you know is in dispute. Do not charge a fee to a customer who has told you they will pay on a particular date, until that date has passed. And do not apply fees by hand to some customers and forget others, because inconsistency is the first thing a customer will point to.

## Disclosure

This article is from Mugavi, which makes accounts receivable software. Mugavi has a late fee rule you set yourself, with a grace period and an optional cap. It never applies a fee on its own: it lists the invoices that are due one, and you choose which to apply. It skips disputed invoices and invoices with a promise to pay. It does not write the fee back to your accounting software and does not add it to the payment page, so you collect it yourself and mark it paid. Everything above works without it.`,
  },
  {
    slug: 'customer-statement-vs-another-reminder',
    title: 'Send a statement instead of another reminder',
    date: '2026-10-02', read: '4 min',
    excerpt: 'If a customer has several overdue invoices, a fifth reminder about one of them is the wrong email. A statement shows everything at once.',
    tags: ['statements', 'invoice reminders', 'accounts receivable'],
    body: `A customer with four overdue invoices is a different problem from a customer with one. Four separate reminders feel like nagging, and each one only mentions a single invoice, so the customer never sees the whole picture.

A statement fixes that. It is a single page listing every open invoice, what is left on each, and the total.

## When a statement works better

- **The customer has more than one overdue invoice.** One document, one total, one payment.
- **They say they did not know.** A statement is hard to argue with, because it lists dates and amounts.
- **Their accounts payable team asks for one.** Many finance teams reconcile against statements, not individual emails.
- **You want to reset the conversation.** A statement is less personal than a final notice, so it is a good middle step.

## What a good statement has

- Each open invoice with its number, issue date and due date
- The amount, the amount paid and the balance left
- How many days late each one is
- A total, and the overdue part of it
- Your payment details, so they can pay without writing back

If you charge late fees, show them on their own lines, separate from the invoices, and include them in the total.

## How often

Monthly is common for customers who deal with you regularly. For a customer who is overdue, send one when you notice, then again after you have had their reply. More than that and it becomes noise.

## Two things to check before you send

First, make sure the invoices on it are really open. A statement that lists an invoice the customer paid last week costs you credibility. Second, check the customer is not in a dispute you have not resolved, because sending a statement mid dispute can look like you are ignoring it.

## Disclosure

This article is from Mugavi, which makes accounts receivable software. In Mugavi, any customer has a Statement page you can read, print, download as a CSV, or email. Emailing it waits 30 seconds so you can undo it, and your payment details print at the bottom. Statements are sent by hand only. Nothing is scheduled. Your accounting software almost certainly has a statement feature too, and that works fine.`,
  },
  {
    slug: 'stop-quickbooks-emailing-your-customers',
    title: 'Stop QuickBooks Online emailing your customers without asking',
    date: '2026-09-30', read: '4 min',
    excerpt: 'Business owners keep finding that QuickBooks sent their customers reminders they never approved. What people report, where to look, and how to stay in control.',
    tags: ['QuickBooks', 'invoice reminders', 'A/R automation'],
    body: `If a customer told you they got a "finish your payment" or "payment overdue" email you never sent, you are not imagining it. QuickBooks Online can send reminders on its own, and several business owners have recently posted about finding out from their clients.

Here is what people report, and what you can do about it. We have not verified every report ourselves, and QuickBooks changes its settings often, so check each step in your own account.

## What people are seeing

- **Reminders for invoices that are already paid.** If a customer pays by check or transfer and you have not recorded it in QuickBooks yet, QuickBooks still sees an open invoice. One owner found late notices going to their only client after that client had paid.
- **Reminders that ignore your arrangements.** An owner who makes verbal payment arrangements said reminders started one day past due, and even went out for an invoice due three days later. They had to apologize to customers.
- **"Finish your payment" emails.** A few owners say their customers get an email after opening an invoice without paying. One said support called it a beta test.
- **Text you did not write.** Some users say QuickBooks adds wording to invoice emails that they cannot edit, or offers customers other ways to pay.

## Check your reminder settings

Several users pointed to the same place: the gear icon, then Account and settings, then Sales, then Reminders. Look for automatic invoice reminders and either turn them off or set them the way you actually want. QuickBooks has also moved reminders into its Workflows area, so if you do not see them there, look for a workflow that contains your invoice reminders.

Two warnings from people who tried:

- Turning reminders off for one invoice did not always stop them, according to one accounting firm. Check the result instead of trusting the toggle.
- Send a test invoice to yourself before you rely on a setting. You will see what your customer sees.

## Record payments the day they arrive

The most common cause of a wrong reminder is a paid invoice that is still marked open. If you are waiting for the bank feed to catch up, a reminder can beat it. Record checks and transfers as soon as you know about them.

## Decide who owns the follow-up

One commenter put it well: problems start "when both sides think the other person is doing it." If you have a bookkeeper, agree who sends the routine reminders, who makes the call when an invoice is two weeks late, and who decides to pause work at 30 days.

## When QuickBooks reminders are not enough

Users say QuickBooks sends the same message to everyone, with no way to hold one customer or use a different tone for a long-standing client. If you need to skip customers, pause when someone replies, or track a promised payment date, you will need either a manual process or a separate tool.

Disclosure: this article is from Mugavi, which makes accounts receivable software. Mugavi drafts each reminder and waits for your approval by default, lets you pause any customer, and pauses reminders when a customer replies. We wrote this because the questions keep coming up, not because the fixes above need our product. Every step above works without us.`,
  },
  {
    slug: 'ar-automation-for-small-business-2026',
    title: 'The state of A/R automation for small businesses in 2026',
    date: '2026-07-10', read: '8 min',
    excerpt: 'QuickBooks AR is unusable. HighRadius is $3K/mo. Gaviti, Growfin, Chaser skip the long tail. Here\'s the gap we\'re building to close.',
    tags: ['A/R automation', 'small business', 'market analysis'],
    body: `The 5-30 person business segment is the most underserved part of the $4-6B accounts-receivable automation market. Here's the data, the gap, and what we're doing about it.

## The pain is real, quantified, and getting worse

Three numbers tell the story:
- **56%** of small businesses are owed money on unpaid invoices. Average **$17,500 per business** (QuickBooks 2025)
- **47%** have invoices overdue 30+ days
- **40%** of owners name bookkeeping & taxes the single worst part of owning a business (SCORE)

And the late-payment crisis is global. In the UK, **£26 billion is owed to small businesses at any time**, and late payments shut down roughly 14,000 UK businesses last year. The pattern repeats in every market that publishes the data.

For a 5-30 person business, the working capital locked up in unpaid invoices isn't a finance problem. It's a hiring problem, a payroll problem, a "can we take that big new client" problem. It determines whether the business grows or stalls.

## The tools don't fit

We spent the first 6 weeks of building Mugavi auditing every A/R tool we could find. The market splits into four buckets, and only one of them actually fits the 5-30 person segment.

### 1. Enterprise (HighRadius, YayPay, Rimilia)
- Price: usually thousands of dollars a month, often by quote
- Implementation: weeks to months
- Needs a finance operations team to run
- Built for large companies

**Not for the 5-30 person segment. Period.**

### 2. Mid-market (Gaviti, Growfin, Chaser, Tesorio, Kolleno)
- Price: from a few hundred dollars a month (Chaser's entry plan was about $259 when we looked) up to around $2,000, and often by quote
- Implementation: 1-2 weeks
- Built for 50-200 person teams
- Real products, but built for bigger teams, and the entry price is more than many very small businesses want to pay

**The closest to viable for some, but still too expensive for most.**

### 3. Legacy SMB (QuickBooks AR module, Xero AR, FreshBooks)
- Price: included with your accounting software
- Implementation: 0 minutes (it's already there)
- Quality: unusable

QuickBooks now covers invoicing, reminders, payment tracking, aging reports, and even a cash-flow planner. What it doesn't do is relationship-aware follow-up, reading a reply, tracking a promise to pay, routing a dispute, or knowing when to pause because a customer already responded. That's a different workflow, not a missing feature list.

### 4. Micro-SaaS attempts (ChaserX, Bloomerang, etc.)
- Price: $19-$99/month
- Quality: variable
- Longevity: concerning (many shut down after a year or two)

**Not enough feature depth. Often single-channel (email only). Often no AI.**

## The wedge: AI-native, SMB-priced

The gap is clear. Nobody is building for the 5-30 person business with:
- **Tone-aware AI dunning** (email + SMS, written by Gemini)
- **Cash-flow forecasting** (4-week prediction based on aging + history)
- **Multi-currency** (USD, GBP, AUD, CAD, EUR)
- **Customer risk scoring**
- **Branded payment portal** with card, ACH, and local rails
- **$79-$399/mo** pricing

That's the wedge. That's what we're building at Mugavi.

## Why now

Three forces are converging:

**1. AI is finally good enough.** Modern LLMs write better dunning copy than most humans. The "polite but firm" tone is hard to get right manually. AI does it in seconds.

**2. SMBs are finally ready.** QuickBooks Online has 7M+ subscribers. Xero has 4M+. The accounting data is in the cloud for the first time in history. The integrations exist.

**3. PE roll-up pressure.** Home service businesses (HVAC, plumbing, electrical) are being acquired at an unprecedented rate. The acquirers need consistent AR processes across the brands they buy. That's a forcing function for the entire segment.

## What we're shipping

In the next 90 days, we're launching:
- **QuickBooks + Xero + Stripe + Square + Plaid integrations** (10-min setup)
- **AI dunning engine** with friendly / firm / final tones
- **4-week cash-flow forecast** with confidence intervals
- **Customer risk scoring** based on payment history
- **Branded payment portal** with card, ACH, wire, and local rails
- **Multi-currency** (USD, GBP, AUD, CAD, EUR on day one)
- **Self-serve onboarding** (no sales call required)

All of it at **$79-399/mo**. 14-day free trial, no credit card.

## Who we serve (and who we don't)

**Best fit:**
- 5-30 person agencies and consultancies
- Xero users (QuickBooks in beta)
- US, UK, AU, CA for day one (more markets later)
- Sells on net-30 or net-60 terms
- Founder/owner does AR today, with no full-time credit controller

**Not for:**
- 1-2 person businesses (use Wave or spreadsheets)
- 200+ person businesses (use HighRadius)
- Product businesses with no AR (use Shopify)
- Construction with retainers (use Procore)
- Anyone in the Fortune 500

## What we'd love to hear from you

We're doing 10 customer interviews in the next 2 weeks. If you run a 5-30 person B2B service business and have thoughts on AR, cash flow, or late payments, we'd love to talk.

Reply to this email or book a 15-min call: https://cal.com/davie-collectly/15min

Davie
Founder, Mugavi
https://mugavi.com
`,
  },

  {
    slug: 'cash-flow-forecasting-small-business',
    title: 'Forecast cash flow when you have 12 open invoices',
    date: '2026-07-05', read: '6 min',
    excerpt: 'A practical guide for owners. Why weighted aging beats straight-line forecasts. And when to ignore your bookkeeper\'s spreadsheet.',
    tags: ['cash flow', 'forecasting', 'small business'],
    body: `Most cash-flow forecasts for small businesses are wrong. They're built on straight-line assumptions ("we'll collect 1/30 of receivables each day") and ignore the most important variable: which invoices will actually pay this week, and which ones will sit for another 30 days.

Here's a better way.

## The problem with straight-line forecasting

The textbook formula is:

**Projected Cash = Current Cash + Expected Receivables - Expected Payables**

Where Expected Receivables = Total A/R ÷ Average DSO

For a business with $184K in A/R and a 30-day DSO, that gives you $184K / 30 = $6.1K/day. Over 7 days, that's $42K of expected cash.

But that's not how it actually works. Here's the real distribution of when invoices pay:

- **30%** pay in the first 7 days after the due date
- **25%** pay in days 8-14
- **15%** pay in days 15-30
- **10%** pay in days 31-60
- **10%** pay in days 61-90
- **10%** are written off

If you have 12 open invoices totaling $184K, a straight-line forecast assumes they'll all pay evenly. They won't. A $42K invoice from a 14-day net customer will probably pay next week. A $24K invoice that's already 60 days past due from a 90-day-paying customer probably won't pay for another 30-60 days.

If you treat them the same, your forecast can be badly wrong.

## Weighted aging: a better model

The improvement is straightforward: weight each invoice by its probability of having paid by a given point, based on its age and the customer's payment history. This is a simplified heuristic, not a backtested predictive model, treat it as a way to prioritize, not a number to plan payroll around.

The probability an invoice is *still unpaid* at day N should decay as N grows past the customer's typical payment day:

**P(still unpaid at day N) = 1 / (1 + e^(k(N - N0)))**

Where:
- N = days past due (or until due, if not yet due)
- N0 = the customer's average days-to-pay
- k = a "decay rate", typically 0.1 for slow payers, 0.3 for fast

For a customer that pays in 14 days on average, an invoice 30 days past due has a low probability of paying in the next week. For a customer that pays in 45 days, a 30-day-past-due invoice is right on schedule.

**This is the same math that Gaviti, Growfin, and HighRadius use, but with one big difference: they use 2-3 year customer histories from thousands of invoices. You have 12 invoices. You don't have that data yet.**

So for the first 90 days, you use industry defaults. After 90 days, you have real data. The forecast gets sharper.

## The 4-week forecast format

Once you have weighted probabilities, you can produce a 4-week forecast that looks like this:

| Week | Expected Cash In | Confidence |
|---|---|---|
| 1 | $24K | Medium (75%) |
| 2 | $32K | Medium (65%) |
| 3 | $18K | Low (50%) |
| 4 | $9K | Low (35%) |

The "confidence" rating drops each week because prediction accuracy degrades with time. By week 4, you're essentially guessing.

**The right way to use this is:**
- **Week 1 cash** = what you can confidently spend today
- **Weeks 2-3 cash** = what you can plan around (hiring, equipment, etc.)
- **Week 4 cash** = directional only, don't make bets

## How to make payroll when runway is short

If your forecast says you can make payroll in week 2 but not week 1, here's the playbook:

1. **Stop all non-payroll spending today.** Cut ad spend, software, anything that's not payroll or revenue-generating.
2. **Aggressively chase the 3-5 highest-probability-to-pay invoices.** Not the biggest. The most likely. The 60-day-past-due $93K from a known-slow payer is not your best bet. The 5-day-past-due $8K from a known-fast payer is.
3. **Offer early-payment discounts.** 2/10 Net 30 ("2% off if you pay in 10 days") is standard. For an invoice you'd otherwise wait 45 days to collect, it's a great trade.
4. **Delay non-critical payables by 7-10 days.** Most vendors will tolerate this with a heads-up.
5. **Draw on a line of credit as a last resort.** Better than missing payroll, but expensive.

The order matters. Aggressive chasing comes first because the cost is just your time, and the upside is huge.

## The thing your bookkeeper's spreadsheet doesn't do

Your bookkeeper's spreadsheet almost certainly uses straight-line aging. That's why their forecast is always wrong.

The fix isn't complicated, it's just not the default in a spreadsheet. Some AR tools do it. Mugavi's cash-flow forecast weights your open invoices by each customer's payment history, which is the same idea.

If you want to try it: https://mugavi.com, 14-day free trial, no credit card, 10-minute setup.

Davie
`,
  },

  {
    slug: 'best-dunning-templates-2026',
    title: 'The 7 dunning email templates that actually get invoices paid',
    date: '2026-07-05', read: '5 min',
    excerpt: 'Patterns from what typically works in dunning emails, and what to avoid. Illustrative benchmarks, not a Mugavi-run study.',
    tags: ['dunning', 'templates', 'collections'],
    body: `These are illustrative benchmarks based on common collections-industry patterns, not a formal Mugavi study. We're a small beta and don't have a dataset that size yet. Here's what tends to work.

## The numbers

- **Average response rate** (recipient clicks "pay now"): 12%
- **Top quartile** (the 25% of templates that work best): 22-35% response rate
- **Bottom quartile**: under 4%
- **Best single subject line** ("Action required: invoice {{number}}"): 41% open rate
- **Worst single subject line** ("URGENT!!! Payment Past Due!!!!"): 8% open rate (and people actively resent it)

The difference between top quartile and bottom quartile isn't tone, length, or branding. It's specificity and timing.

## What works

### 1. Day 1: friendly nudge (best: 28% response)

**Subject:** Quick reminder: invoice {{number}}

**Body:**

Hi {{contact_name}},

Just a quick nudge that invoice {{number}} for {{amount}} was due on {{due_date}}. You can settle it here: {{payment_link}}

Thanks!
{{business_name}}

**Why it works:** It's short, friendly, and assumes good intent. Most late payments are forgetfulness, not malice. This catches the 30-40% of late payers who just forgot.

### 2. Day 4: gentle follow-up (best: 24% response)

**Subject:** Following up: invoice {{number}}

**Body:**

Hi {{contact_name}},

Following up on invoice {{number}} for {{amount}}, which was due {{days_overdue}} days ago. If there's an issue with the invoice or you need a different payment method, just reply, happy to help.

Pay here: {{payment_link}}

Thanks,
{{business_name}}

**Why it works:** It opens the door to a conversation. "If there's an issue" gives them permission to mention a problem they might otherwise hide. Many late payments are caused by issues the customer hasn't raised.

### 3. Day 7: firm reminder (best: 19% response)

**Subject:** Invoice {{number}} is 7 days past due

**Body:**

Hi {{contact_name}},

Invoice {{number}} for {{amount}} is now 7 days past due. Please review and settle at your earliest convenience: {{payment_link}}

If there's a reason for the delay, just reply, we'd rather understand than chase.

Best,
{{business_name}}

**Why it works:** It's matter-of-fact. It states the fact, offers a path forward, and shows you're not going away. It doesn't threaten, but it doesn't apologize either.

### 4. Day 14: clear action required (best: 17% response)

**Subject:** Action required: invoice {{number}}

**Body:**

Hi {{contact_name}},

Our records show invoice {{number}} for {{amount}} is 14 days overdue. This is now affecting our ability to manage your account.

Please confirm payment status or settle the balance: {{payment_link}}

If there's an issue, reply today. Otherwise, payment is required this week.

{{business_name}}

**Why it works:** The phrase "action required" gets opens. "Affecting our ability to manage your account" is a soft consequence that doesn't threaten but signals seriousness.

### 5. Day 21: phone call request (best: 22% response)

**Subject:** Quick call about invoice {{number}}?

**Body:**

Hi {{contact_name}},

Invoice {{number}} is now 21 days past due. We'd prefer to sort this out by phone rather than keep emailing.

Can you call us at {{phone}} today, or let me know a good time?

{{business_name}}

**Why it works:** It breaks the email loop. Most late-payment email threads die because nobody picks up the phone. This forces a conversation. And a 5-minute phone call resolves 60% of late-payment issues that email can't.

### 6. Day 30: final notice (best: 31% response)

**Subject:** Final notice: invoice {{number}}

**Body:**

Hi {{contact_name}},

Invoice {{number}} for {{amount}} is 30 days past due. This is our final reminder before this account is referred for external collections.

To avoid that, please settle here: {{payment_link}} or reply today with a plan.

{{business_name}}

**Why it works:** "Final notice" is one of the most reliable subject lines in collections. "Referred for external collections" is the consequence. Most customers don't want the friction of collections, they'll pay or negotiate.

### 7. Day 45: collections (best: 18% response)

**Subject:** Account being referred for collections: invoice {{number}}

**Body:**

Hi {{contact_name}},

This is notification that invoice {{number}} for {{amount}} is being referred to our external collections partner. Once this happens, additional fees (typically 15-30%) will be added to your balance, and your account may be reported.

To avoid this, settle the full balance here within 7 days: {{payment_link}}

{{business_name}}

**Why it works:** It states the consequence plainly. Note: only send this if it's true, collection-referral fees, timing, and reporting rules depend on your contract terms, the collections partner you actually use, and your jurisdiction. Don't send this template unless you have a real collections arrangement behind it.

## What doesn't work

- **Aggressive subject lines** ("URGENT", "PAST DUE", "FINAL DEMAND"): 30-50% lower open rate
- **Long emails** (more than 150 words): 20-30% lower response rate
- **All-caps subject lines**: spam-filtered, lower open rate
- **Exclamation points**: lower trust, lower response
- **Legal threats before day 30**: customer resents, often escalates
- **Mentioning credit scores or personal liability**: almost never appropriate
- **"Hope you're well"**: outdated opener, looks like a template
- **Asking for payment without offering a payment link**: 60% lower conversion

## The math

If you send a 4-email sequence (Day 1, 7, 14, 30) to 100 overdue invoices:
- 30-40% pay at Day 1
- 20-30% pay at Day 7
- 10-15% pay at Day 14
- 10-15% pay at Day 30

Total recovery: **70-90%** of invoices paid within 30 days. Industry baseline without automation: 40-50%.

**That's the difference between a healthy business and a constant cash-flow crisis.**

If you want to test these templates without building the system: mugavi.com automates all 7 in 10 minutes, from $79/mo. 14-day free trial.

Davie
`,
  },
  {
    slug: 'cut-dso-5-step-playbook-2026',
    title: 'How to cut your DSO: the 5-step playbook (free)',
    date: '2026-07-14', read: '7 min',
    excerpt: 'A field-tested playbook for cutting days-sales-outstanding. No enterprise software, no consultants. Just 5 things you can do this quarter to get paid faster.',
    tags: ['DSO', 'cash flow', 'playbook', 'small business'],
    body: `If you've ever looked at your accounts-receivable aging report and felt a small knot in your stomach, this post is for you. We wrote a free 7-page playbook on cutting DSO, and this is the executive summary.

## What DSO actually means (and why it matters)

DSO, Days Sales Outstanding, is the average number of days it takes you to collect payment after issuing an invoice. The formula is simple:

**(Total accounts receivable ÷ total credit sales) × number of days**

A 5-30 person service business with $3M ARR and a 45-day DSO has roughly **$370k locked up in unpaid invoices at any given time**. Cut that to 18 days and you free up **$222k of working capital**. That's not a finance metric. That's the difference between hiring two more people and missing payroll in Q3.

## Why your DSO is high (the real reason)

It's not because customers are bad. It's not because your invoices are unclear. It's because **you have no system**. Most founders we talk to have one of three patterns:

1. **The "send and pray"**, invoice goes out, founder waits 30 days, then awkwardly chases
2. **The "big bang chase"**, first reminder goes out at 45 days, by which time the customer has forgotten the invoice exists
3. **The "manual spreadsheet"**, somebody is supposed to be following up, but they forgot, and the spreadsheet has 47 rows

All three have the same root cause: **no automated, escalating, tone-aware system**. That's what we're going to fix.

## The 5 steps (summary; full detail in the playbook)

### Step 1: Audit your A/R aging every Monday morning

Open the aging report. Sort by amount, not by date. The biggest unpaid invoice, even if it's only 14 days old, is the most dangerous one. A 5-minute weekly habit that surfaces $50k+ problems before they age into write-offs.

### Step 2: Set up a 3-step dunning sequence that auto-fires

Friendly reminder at day +1. Firm reminder at day +7. Final notice at day +14. That's it. Anything more complicated and you'll never maintain it. The whole thing should take 30 minutes to set up in a tool like Mugavi, or 2 hours in a spreadsheet + email rules.

### Step 3: Give every customer a frictionless pay link

Card. ACH. Wire. Whatever. The friction to pay is the biggest predictor of *when* they pay. If they have to log into a portal they forgot the password to, they will put it off. If they can click a link in the email and pay in 30 seconds, many will do it while they are reading it. We have no numbers of our own on how much faster, so test it on your own invoices.

### Step 4: Risk-score your customers and focus on the top 5

Not all invoices are equal. A $5,000 invoice from a customer who's paid every invoice in 14 days for 3 years is not the same as a $5,000 invoice from a new customer. Score them on (a) payment history, (b) recency of first invoice, (c) amount relative to their typical invoice. Spend your time on the top 5 riskiest invoices, not the top 50.

### Step 5: Measure DSO weekly, not monthly

Monthly DSO reports tell you what already happened. Weekly DSO tracking (5 minutes, every Monday) tells you what's about to happen. The trend is more important than the absolute number. If your DSO is 30 days but trending up to 38 over 4 weeks, you have a problem this month, not next month.

## What a lower DSO is worth

This is arithmetic, not a case study. A business that bills $3 million a year bills about $8,200 a day. Every day taken off DSO frees roughly one day of billing as cash, so cutting DSO by 27 days frees about $222,000 of working capital. That is the cost of one or two senior hires, and you get it back without finding a single new customer.

The number that changes the business is the cash buffer. With more cash in the bank you can take a slow month, hire ahead of revenue, or accept a big client that pays in 60 days. At a high DSO you cannot do any of that.

## Get the full playbook (free)

The full 7-page playbook goes deeper:

- The exact email templates for friendly / firm / final tones (with subject line A/B variants)
- How to negotiate payment terms upfront (with the script)
- A 12-week implementation timeline
- A 1-page A/R scorecard template
- The 7 dunning mistakes that make customers angrier (and the alternatives)

**[Download the free playbook →](/playbook)** (no email required to skim, email only to get the PDF).

## What to do today

Pick one of the 5 steps above and do it this week. Don't try to implement all 5 at once. If you do nothing else, do Step 1 (the Monday morning aging audit). It costs you 5 minutes and surfaces 80% of your problems.

If you want help implementing the rest, that's what Mugavi does. 14-day free trial, no card required. → https://mugavi.com/sign-up

Davie
`,
  },
  {
    slug: 'true-cost-of-late-payments-small-business-2026',
    title: 'The true cost of late payments for small businesses',
    date: '2026-07-15', read: '6 min',
    excerpt: 'Late invoices cost the average 10-person service business $17,500 in cash plus another $4,000+ in hidden costs. The full breakdown, with sources, and the 4 actions that actually move the number.',
    tags: ['late payments', 'cash flow', 'small business', 'data'],
    body: `Late payments are a tax on small businesses. We hear the number "$17,500 average per business" thrown around a lot. Let's actually look at where that comes from, what's behind it, and what the real cost is when you include the stuff people don't count.

## The headline number, sourced

The most-cited data point is from QuickBooks' 2025 *Small Business Late Payments Report*:
- **56%** of small businesses have unpaid invoices outstanding right now
- **Average $17,500** per business with outstanding invoices
- **47%** have invoices 30+ days overdue
- **$815 billion** in total late payments across US small businesses annually

The UK picture is similar. The *Late Payment Survey* from the Federation of Small Businesses puts the number at **£26 billion** owed to small businesses at any time, and roughly **14,000 UK businesses shut down each year** specifically because a customer didn't pay on time.

The pattern is global. Australia, Canada, EU, Singapore, all in the same range when you adjust for business population. The 30-60 day net-terms default is the single most consequential business norm in B2B, and almost nobody has measured its real cost.

## The hidden costs nobody counts

$17,500 in outstanding A/R is the visible cost. The real cost includes four things most founders don't add up:

### 1. The cost of the line of credit

If your business has a line of credit, you're paying interest on the working capital that's locked up in unpaid invoices. At 9% APR on $17,500, that's **$1,575/year**, just to bridge the gap. Most founders don't think of this as a "late payment cost" but it absolutely is.

### 2. The opportunity cost of slow hiring

A 12-person agency with $3M ARR and a 45-day DSO has ~$370k locked up. That same business at 18-day DSO has ~$148k locked up. The difference, **$222k of working capital**, is the size of two senior hires or a full quarter of operating runway. Late payments don't just delay payroll, they delay *growth*.

### 3. The founder-time cost

Founders spend an average of **11 hours per week** chasing unpaid invoices (Xero 2024). At a $150k founder salary, that's roughly **$32/hr fully-loaded** in opportunity cost, call it **$18,000/year per founder** in time that could go to selling, building, or hiring. For a 5-person business where the founder does most of the chasing, it's worse.

### 4. The bad-debt write-off

Roughly **3-5% of revenue** becomes bad debt in the average small service business. For a $3M agency, that's **$90-150k/year** that never gets collected. Late payments and bad debt are the same problem, just at different stages of escalation.

## The real total

For a typical 10-person service business with $2M revenue and a 50-day DSO, the real annual cost of late payments looks like this:

| Cost category | Annual impact |
|---|---|
| Visible A/R outstanding (avg) | $17,500 |
| Line-of-credit interest on A/R | $1,575 |
| Lost growth (hiring, runway) | $50,000+ |
| Founder time (11 hrs/wk @ \$32/hr) | $18,000 |
| Bad-debt write-off (3% of revenue) | $60,000 |
| **Real total** | **~$147,000/year** |

That's **7.4% of revenue** going to the cost of getting paid for work you already did. Compare that to the cost of fixing it: a $399/month tool that cuts DSO from 50 to 25 days. The math is not subtle.

## What actually moves the number

Four actions, in order of leverage:

1. **Move from "send and pray" to automated dunning.** One dunning email at 7 days. Another at 14. A final at 30. Most founders do zero of these. Even basic automation cuts DSO by 5-10 days.
2. **Tighten payment terms upfront.** Net-15 is the new default for service businesses that take this seriously. If your customers are on Net-60, every term you negotiate down to Net-30 is roughly **half your DSO** off the top.
3. **Require deposits on new customers.** A 25-50% deposit on the first invoice eliminates the worst-case: doing the work and never getting paid. This is the single most under-used tactic in the 5-30 person segment.
4. **Use a frictionless payment link.** Every email reminder should include a pay link. Customers who can pay in 30 seconds pay 6-9 days faster than customers who have to log into a portal they forgot the password to.

You don't need a $3K/month enterprise AR tool to do any of these. You need 30 minutes and the discipline to do them every week.

## Why this problem persists

The reason late payments are so persistent is that **the cost is distributed and the benefit of fixing it is concentrated.** A single founder bears all the time, interest, and lost growth, but a single customer has no incentive to pay faster. The asymmetry is the entire reason an industry exists to fix it.

If you're a small business owner reading this and the math above feels familiar, that's because it is. The first step is the Monday morning A/R aging audit, 5 minutes, every Monday, sorted by amount, not by date. That single habit surfaces 80% of the problem.

Davie
`,
  },
  {
    slug: 'final-notice-that-gets-paid-2026',
    title: 'How to write a final notice that gets paid (4 templates)',
    date: '2026-07-15', read: '5 min',
    excerpt: 'Most "final notices" are too long, too legal, and too late. Here\'s the 4-paragraph structure that gets paid within 7 days, and 4 templates you can copy.',
    tags: ['dunning', 'final notice', 'templates', 'collections'],
    body: `The "final notice" email is the most-rewritten document in any business that hasn't automated its collections. It's also the most poorly-written. Here's the structure that works, the 4 versions you actually need, and what to never do.

## Why most final notices fail

Three things make a final notice useless:

1. **Too long.** Customers skim. If your final notice is more than 4 short paragraphs, you've lost them at "Dear Sir/Madam."
2. **Too legal.** "We hereby demand immediate payment in full, failing which we will initiate proceedings" reads like a chain email from 2003. Modern customers read it and roll their eyes.
3. **Too late.** If the final notice is the first time you're saying "we really mean it," you've already lost. The "final" needs to land on a customer who has been hearing from you for 30 days, not be the first signal that something is wrong.

The goal of a final notice is not to threaten. It's to **clarify, document, and provide a clean path forward.** Customers who want to pay will pay; customers who can't pay need help; customers who refuse to pay are a separate problem.

## The 4-paragraph structure

### Paragraph 1: The fact (what's owed, when it was due)

Not "our records show." Just the numbers.

> Invoice 2415 for $11,600 was due on March 15. As of today it's 65 days past due.

That's it. No preamble, no apology, no explanation.

### Paragraph 2: The action (what happens next, calmly)

State what will happen if it's not paid, in one sentence. Don't bluster.

> To keep your account in good standing, we'll need payment by [date, 7 days out]. If we don't hear from you by then, we'll pause services on [date] and refer the balance to collections on [date].

The key is **specific dates, not vague threats.** "We'll refer this to collections" is ignored. "We'll refer this to ABC Collections on July 22" is acted on.

### Paragraph 3: The path (how to resolve)

Make it trivially easy. One click. One link.

> You can pay the full balance here: [link]. If you'd like to discuss a payment plan, reply to this email and I'll send options today.

The reply path is critical. A surprising number of late-paying customers *want* to pay but are embarrassed or unsure how to ask for a plan. Give them an out.

### Paragraph 4: The close (one line, human)

End on a note that signals "I'm a person, not a system."

> Thanks for taking care of this.
>
> Davie

That's it. No exclamation points. No emoji. No "URGENT" in the subject. Just facts, dates, a path, and a human signature.

## 4 templates you can copy

### Template 1: The standard final notice (email, day 30+)

**Subject:** Invoice 2415: final notice before action on July 22

> Hi {{contact_name}},
>
> Invoice 2415 for $11,600 was due on March 15. As of today it's 65 days past due.
>
> To keep your account in good standing, we'll need payment by July 22. If we don't hear from you by then, we'll pause services on July 25 and refer the balance to collections on July 29.
>
> You can pay the full balance here: [link]. If you'd like to discuss a payment plan, reply to this email and I'll send options today.
>
> Thanks for taking care of this.
>
> Davie

### Template 2: The SMS version (under 320 chars)

> Final notice: Invoice 2415 ($11,600) is 65+ days past due. To avoid service suspension on July 25, please pay or reply to discuss options: [link]
>
> Davie, Mugavi

SMS final notices work because the customer reads them. Don't use SMS for soft reminders; do use it for the final.

### Template 3: The "I want to help" version (when you suspect it's a cash-flow issue)

**Subject:** Quick chat about Invoice 2415?

> Hi {{contact_name}},
>
> Invoice 2415 for $11,600 is now 65 days past due. I want to flag it before it becomes a bigger problem on either side.
>
> If cash flow is the issue, I can split it into 3 payments over 30 days. If there's a problem with the work, I'd rather know now. If everything's fine and it just slipped, the link below settles it in 30 seconds.
>
> What works for you?
>
> [link]
>
> Davie

This version works surprisingly often. A third of the time the customer is having their own cash-flow problem and is relieved to be offered a plan. A third of the time there was an actual issue with the work and you've now saved a relationship. A third of the time they pay within 48 hours.

### Template 4: The collections-handoff version (after 60+ days, when you've genuinely given up)

**Subject:** Invoice 2415: referral to collections July 29

> Hi {{contact_name}},
>
> This is a final attempt to reach you about Invoice 2415 for $11,600, now 75 days past due.
>
> We've sent 4 reminders and 2 phone calls. If we don't receive payment or hear from you by July 22, this account will be referred to ABC Collections on July 29. After that, all correspondence goes through them and a 15% collections fee will be added to the balance.
>
> This is the easiest time to resolve this. The link below settles the original $11,600 with no fees: [link]
>
> Davie

The "before that date" framing is intentional. It tells the customer: *you have one last clean way out, take it.*

## What to never do

- **Don't use legal language.** "We hereby demand" is a chain-email tell. Customers delete it.
- **Don't use URGENT in the subject.** It goes to spam, and the customers who do see it are trained to ignore it.
- **Don't write a 500-word essay.** Long emails are a signal that you're nervous. Short, specific, dated emails are a signal that you know what you're doing.
- **Don't make empty threats.** If you say you'll pause services on July 25, do it. If you say you'll refer to collections, do it. Customers can smell bluffing.
- **Don't CC your lawyer.** The lawyer CC is a power move that escalates a $1k invoice into a relationship-ending event. Save it for actual legal disputes, not routine collections.

## The bigger point

The final notice isn't the hard part. The hard part is the **30 days of reminders before it**, the friendly nudge on day 1, the firm reminder on day 7, the action-required on day 14. By the time the final notice lands, the customer should already know exactly where things stand. The final is just the last clean step before a real consequence.

If your business sends fewer than 4 touchpoints before a final notice, the final notice isn't the problem. The process is.

Davie
`,
  },
];

export const POSTS_BY_SLUG: Record<string, Post> = POSTS.reduce((acc, p) => { acc[p.slug] = p; return acc; }, {} as Record<string, Post>);
