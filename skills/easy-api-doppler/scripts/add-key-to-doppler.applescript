-- Add Key to Doppler
--
-- A one-press button for a hardware key, a Stream Deck, or a mouse button.
-- Copy an API key from wherever you got it, press this, answer two questions.
--
-- The key travels clipboard -> stdin -> Doppler. It is never written to a
-- file, never shown on screen, never passed as a command-line argument, and
-- never reaches your AI session. This script only ever reads its first twelve
-- characters and its length, which is enough to guess a variable name.
--
-- On the way out the clipboard is deliberately overwritten: the key comes off
-- and a line to paste into your session goes on. That ordering matters. The
-- only safe write command is `pbpaste | doppler secrets set`, so putting that
-- command on the clipboard first would destroy the very value it needs to read.
--
-- Every refusal and every confirmation lives in doppler-set.sh, which this
-- calls. The button is the dialog; the script is the judgement. Keeping them
-- in one place is deliberate: the button used to carry its own weaker copy of
-- the checks, and the copy is what let a variable name through as a value on
-- 2026-08-29 and destroyed a live production key.

on sh(cmd)
	return do shell script "export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; " & cmd
end sh

on bail(msg)
	display alert "Add Key to Doppler" message msg as critical buttons {"OK"} default button 1
	error number -128
end bail

-- Where doppler-set.sh lives. The button is compiled into ~/Applications and
-- the script stays in the skill, so the path is resolved rather than assumed.
on setterPath()
	set p to (POSIX path of (path to home folder)) & ".claude/skills/easy-api-doppler/scripts/doppler-set.sh"
	try
		sh("test -x " & quoted form of p)
	on error
		bail("Cannot find doppler-set.sh where it should be:" & return & return & p & return & return & "Re-run install-button.sh from the skill's scripts folder.")
	end try
	return p
end setterPath

-- Twenty prefixes worth recognising. Add your own; the dialog is editable
-- either way, so a wrong guess costs one keystroke.
on guessName(p)
	if p starts with "sk-ant-" then return "ANTHROPIC_API_KEY"
	if p starts with "xai-" then return "XAI_API_KEY"
	if p starts with "sk-or-" then return "OPENROUTER_API_KEY"
	if p starts with "sk-" then return "OPENAI_API_KEY"
	if p starts with "re_" then return "RESEND_API_KEY"
	if p starts with "whsec_" then return "STRIPE_WEBHOOK_SECRET"
	if p starts with "sk_live_" or p starts with "sk_test_" then return "STRIPE_SECRET_KEY"
	if p starts with "rk_live_" or p starts with "rk_test_" then return "STRIPE_RESTRICTED_KEY"
	if p starts with "pk_live_" or p starts with "pk_test_" then return "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
	if p starts with "ghp_" or p starts with "github_pat_" then return "GITHUB_TOKEN"
	if p starts with "SG." then return "SENDGRID_API_KEY"
	if p starts with "apify_api_" then return "APIFY_TOKEN"
	if p starts with "ntn_" or p starts with "secret_" then return "NOTION_TOKEN"
	if p starts with "AIza" then return "GOOGLE_API_KEY"
	if p starts with "phc_" then return "NEXT_PUBLIC_POSTHOG_KEY"
	if p starts with "dop_v1_" then return "DOPPLER_TOKEN"
	if p starts with "eyJ" then return "SUPABASE_SERVICE_ROLE_KEY"
	if p starts with "tskey-" then return "TAILSCALE_KEY"
	if p starts with "dp.pt." or p starts with "dp.st." then return "DOPPLER_TOKEN"
	if p starts with "shpat_" then return "SHOPIFY_ACCESS_TOKEN"
	if p starts with "xoxb-" or p starts with "xoxp-" then return "SLACK_BOT_TOKEN"
	return ""
end guessName

on run
	activate

	set setter to setterPath()

	-- Doppler has to be installed and logged in.
	try
		sh("command -v doppler >/dev/null && doppler me --json >/dev/null 2>&1")
	on error
		bail("Doppler is not installed, or you are not logged in." & return & return & "Open Terminal and run:  doppler login")
	end try

	-- Read the prefix and the length only. The full key never enters a variable.
	set info to ""
	try
		set info to sh("pbpaste | awk 'NR==1{printf \"%s|%d\", substr($0,1,12), length($0)}'")
	end try
	if info is "" then bail("The clipboard is empty." & return & return & "Copy the API key first, then press the button.")

	set AppleScript's text item delimiters to "|"
	set kPrefix to text item 1 of info
	set kLen to (text item 2 of info) as integer
	set AppleScript's text item delimiters to ""

	-- Pin what is on the clipboard NOW, before any dialog opens. From here on
	-- every write is checked against this fingerprint, so if anything is copied
	-- while the dialogs are up the write is refused instead of silently storing
	-- the new thing. This is the exact failure that stored a variable name as a
	-- production secret: the user copied the NAME to paste into the name field.
	set clipSha to sh("pbpaste | tr -d '\\n' | shasum -a 256 | awk '{print $1}'")

	-- Judge the clipboard BEFORE asking anything. A bad clipboard is a bad
	-- clipboard whatever project you were going to pick, and finding out at the
	-- end means answering two dialogs to be told the first thing was wrong.
	set vReport to ""
	try
		set vReport to sh("DOPPLER_SET_EXPECT_SHA=" & clipSha & " bash " & quoted form of setter & " --validate 2>&1")
	on error vErr
		bail(vErr & return & return & "Nothing was written, and no project was touched.")
	end try

	set shortValue to (vReport contains "SHORT ")
	if shortValue then
		set vendorHint to guessName(kPrefix)
		if vendorHint is "" then
			set vendorHint to "No recognised vendor prefix either."
		else
			set vendorHint to "The prefix does look like " & vendorHint & "."
		end if
		set okShort to display dialog "That clipboard is only " & kLen & " characters." & return & return & "Most API keys run 32 to 200. " & vendorHint & return & return & "Check you copied the whole key, and the right one." with title "Add Key to Doppler" buttons {"Cancel", "Use it anyway"} default button "Cancel" with icon caution
		if button returned of okShort is "Cancel" then return
	end if

	-- Project list, read live so it can never go stale. No python, no jq:
	-- both are absent or gated behind an install prompt on a stock Mac.
	set projRaw to ""
	try
		set projRaw to sh("doppler projects --json | tr '}' '\\n' | sed -n 's/.*\"name\":\"\\([^\"]*\\)\".*/\\1/p' | sort | awk '$0==\"example-project\"{e=$0;next}{print}END{if(e)print e}'")
	end try
	if projRaw is "" then bail("Could not read your Doppler project list." & return & return & "Check that `doppler projects` works in Terminal.")

	set AppleScript's text item delimiters to return
	set projList to text items of projRaw
	set AppleScript's text item delimiters to ""

	set chosen to choose from list projList with title "Add Key to Doppler" with prompt "Which project?" default items {item 1 of projList}
	if chosen is false then return
	set proj to item 1 of chosen

	-- Variable name. Offer the names this project already holds, because
	-- replacing an existing key is the common case and picking from a list
	-- means never copying the name -- which is what used to destroy the key
	-- sitting on the clipboard.
	set existingRaw to ""
	try
		set existingRaw to sh("doppler secrets --only-names --json --project " & quoted form of proj & " --config dev | tr ',' '\\n' | sed -n 's/.*\"\\([A-Za-z_][A-Za-z0-9_]*\\)\":{}.*/\\1/p' | grep -v '^DOPPLER_' | sort")
	end try

	set hint to "Key starts \"" & kPrefix & "...\", " & kLen & " characters."
	set nameGuess to guessName(kPrefix)
	set rawName to ""
	set dryRun to false

	if existingRaw is not "" then
		set AppleScript's text item delimiters to return
		set nameList to text items of existingRaw
		set AppleScript's text item delimiters to ""
		set nameList to nameList & {"— type a new name —"}
		set picked to choose from list nameList with title "Add Key to Doppler" with prompt "Which variable in " & proj & "?" & return & hint default items {"— type a new name —"}
		if picked is false then return
		if item 1 of picked is not "— type a new name —" then set rawName to item 1 of picked
	end if

	if rawName is "" then
		set reply to display dialog "Variable name for " & proj & "?" & return & return & hint & return & return & "Type it. Do not copy it -- copying replaces the key on your clipboard." default answer nameGuess with title "Add Key to Doppler" buttons {"Cancel", "Test only", "Save"} default button "Save"
		if button returned of reply is "Cancel" then return
		set dryRun to (button returned of reply is "Test only")
		set rawName to text returned of reply
	else
		set reply2 to display dialog "Write to " & rawName & " in " & proj & "?" & return & return & hint with title "Add Key to Doppler" buttons {"Cancel", "Test only", "Save"} default button "Save"
		if button returned of reply2 is "Cancel" then return
		set dryRun to (button returned of reply2 is "Test only")
	end if
	if rawName is "" then return

	set varName to sh("printf %s " & quoted form of rawName & " | tr '[:lower:]' '[:upper:]' | tr -c 'A-Z0-9_' '_' | sed 's/_*$//'")
	if varName is "" then bail("That name has no usable characters in it.")

	-- Dry run first. Every refusal is the script's, so the button cannot drift
	-- out of step with it, and nothing has been written when this comes back.
	set report to ""
	try
		set report to sh("DOPPLER_SET_EXPECT_SHA=" & clipSha & " bash " & quoted form of setter & " --check " & quoted form of varName & " " & quoted form of proj & " dev prd 2>&1")
	on error errMsg
		bail(errMsg)
	end try
	if report does not end with "OK" then bail(report)

	if dryRun then
		display alert "Add Key to Doppler" message "Test only. Nothing was written." & return & return & report buttons {"OK"} default button 1
		return
	end if

	-- Turn the two risky findings into one plain question rather than a silent write.
	set warnings to ""
	if report contains "EXISTS dev" or report contains "EXISTS prd" then
		set warnings to warnings & "• " & varName & " already has a value here. Saving destroys it, and Doppler keeps no rollback on this plan." & return
	end if
	if report contains "SYNCED " then
		set warnings to warnings & "• This pushes straight to a deploy platform within seconds. The platform keeps no version history, so a wrong value cannot be undone there." & return
	end if

	set extraFlags to ""
	if shortValue then set extraFlags to " --force"
	if warnings is not "" then
		set ok to display dialog "Before writing " & varName & " to " & proj & ":" & return & return & warnings & return & "Continue?" with title "Add Key to Doppler" buttons {"Cancel", "Write it"} default button "Cancel" with icon caution
		if button returned of ok is "Cancel" then return
		set extraFlags to extraFlags & " --overwrite --allow-sync"
	end if

	-- The write. Guards, --silent and the read-back all live in the script.
	try
		sh("DOPPLER_SET_EXPECT_SHA=" & clipSha & " bash " & quoted form of setter & " " & quoted form of varName & " " & quoted form of proj & " dev prd" & extraFlags & " >/dev/null 2>&1 </dev/null")
	on error
		set why to ""
		try
			set why to sh("DOPPLER_SET_EXPECT_SHA=" & clipSha & " bash " & quoted form of setter & " " & quoted form of varName & " " & quoted form of proj & " dev prd" & extraFlags & " 2>&1 </dev/null | tail -6")
		end try
		bail("Writing " & varName & " to " & proj & " failed." & return & return & why)
	end try

	-- Swap the clipboard: key off, instruction for the AI session on.
	set handoff to varName & " is now in Doppler under " & proj & " (dev and prd). Wire it into the app and run things with: doppler run -p " & proj & " -c dev -- <cmd>"
	set the clipboard to handoff

	display notification varName & " saved to " & proj & ". Exercise it against the real API before trusting it." with title "Add Key to Doppler"
end run
