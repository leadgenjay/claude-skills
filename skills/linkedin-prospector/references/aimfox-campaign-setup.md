# Building the Aimfox campaign

<!-- UNVERIFIED: written from the approved plan, not yet checked against the live Aimfox UI.
     Button and menu labels below are descriptive; confirm them during the live Aimfox probe
     and replace this comment. -->

You build this campaign once, by hand, in Aimfox. After that the skill adds people to it and
Aimfox does the sending at its own safe pace. It takes about ten minutes.

Nothing sends until you press Start in Aimfox yourself, and before you do, the skill shows you a
checklist of the three settings that matter. A mistake here costs you a WRONG line on that
checklist, not a bad send.

## 1. Connect your LinkedIn account

In Aimfox, connect the LinkedIn account you want to send from. Use the same account you will
connect to Unipile for the closer. Two different accounts would mean replies land somewhere the
closer cannot see.

## 2. Create the campaign with an empty audience

Start a new campaign and pick the type that takes a list of people you supply, rather than one
that runs a LinkedIn search for you. Do not add anyone. The skill adds prospects through the
API, one batch at a time, after it has checked each one.

Name it something you will recognise, for example `LinkedIn prospector`.

## 3. The sequence: exactly two steps

**Step 1, Connect.** Leave the note field empty. The request goes out blank on purpose: blank
requests average about a 50% acceptance rate, while personalized or promotional notes come in
under 20%.

**Step 2, Message, after the connection is accepted.** Set a short wait (a few hours up to one
day reads as natural). The message text is exactly this and nothing else:

```
{{welcome_message}}
```

No greeting before it, no sign-off after it, no space or line break around it. The skill
already wrote a complete message for each person and stored it in that variable. Anything you
add here would be sent to everyone on top of it.

Do not add a third step. Follow-ups after the welcome message are the closer's job, and it only
writes when the person has answered.

## 4. Stop the sequence when someone replies

Turn on the setting that stops the sequence for a lead once they reply. This is the main guard
against Aimfox sending an automated step to someone who is already in a real conversation.
The skill's `sync` also removes anyone who replied from the campaign, as a second guard, but it
only runs once an hour.

## 5. Leave it paused

Do not start the campaign yet. `push` adds the first batch to the paused campaign, checks each
person's stored message, and then shows you the checklist below. You press Start after that.

## 6. Put the campaign id in config

Open the campaign and copy its id from the browser address bar. Paste it into `config.json`:

```json
"aimfox_campaign_id": "paste-the-id-here"
```

Then run:

```bash
node ~/.claude/skills/linkedin-prospector/scripts/prospector.mjs setup-check
```

It confirms the key works and the campaign can be read.

## 7. Check, then press Start

After the first batch is in, Claude shows you this checklist:

| Check | Right when |
|---|---|
| Connect step | The note is empty. |
| Message step | The text is exactly `{{welcome_message}}`. |
| Stop on reply | Turned on. |

Each line reads "looks right", "WRONG", or "Aimfox does not say, check it". Below it is one
real prospect's welcome message; open the campaign preview in Aimfox and make sure that lead's
message matches. Fix anything marked WRONG, check the rest by eye, and press Start.

Then tell Claude you pressed it. It confirms the campaign is running and unchanged, records
your Start, and sets up the hourly loop. Pressing Start is the only confirmation; there is
nothing to type.

## If you edit the campaign later

Later batches go into the running campaign on their own. If you change the campaign after you
start it, the next batch is held, and `needs-you.md` asks you to pause the campaign. Pause it,
check it against this page, and ask Claude to push again. You get the same checklist, and you
press Start again. If Aimfox gives the skill no way to see edits, every new batch goes through
this pause and Start round.
