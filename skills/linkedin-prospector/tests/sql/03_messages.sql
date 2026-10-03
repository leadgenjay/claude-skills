-- Claim / finish / expire / daily caps / unanswered streak, sequential cases.
\set ON_ERROR_STOP 1
truncate li_messages, li_alerts, li_prospects restart identity cascade;

do $$
declare
  m bigint;
  s text;
  i int;
begin
  insert into li_messages (kind, external_id, body) values ('reply', 'retry-1', 'hi') returning id into m;
  for i in 1..2 loop
    if not claim_message(m) then raise exception 'FAIL claim % refused', i; end if;
    if claim_message(m) then raise exception 'FAIL a sending row was claimed twice'; end if;
    s := finish_message(m, 'error');
    if s <> 'draft' then raise exception 'FAIL error % gave %, expected draft', i, s; end if;
  end loop;
  perform claim_message(m);
  s := finish_message(m, 'error');
  if s <> 'failed' then raise exception 'FAIL third error gave %, expected failed', s; end if;
  if claim_message(m) then raise exception 'FAIL a failed row was claimed'; end if;
  raise notice 'PASS error returns the row to draft twice, third failure sets failed';

  insert into li_messages (kind, external_id, body) values ('reply', 'ok-1', 'hi') returning id into m;
  perform claim_message(m);
  s := finish_message(m, 'sent');
  if s <> 'sent' or (select sent_at from li_messages where id = m) is null then
    raise exception 'FAIL sent outcome gave % / no sent_at', s;
  end if;
  if finish_message(m, 'error') is not null then raise exception 'FAIL finish on a sent row changed it'; end if;
  begin
    perform finish_message(m, 'maybe');
    raise exception 'FAIL unknown outcome accepted';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'PASS sent outcome sets sent and sent_at';
end $$;

do $$
declare
  p bigint;
  m bigint;
begin
  insert into li_prospects (public_id, status) values ('stop-person', 'do_not_contact') returning id into p;
  insert into li_messages (prospect_id, kind, external_id, body) values (p, 'reply', 'dnc-1', 'hi') returning id into m;
  if claim_message(m) then raise exception 'FAIL claimed a draft to a do_not_contact prospect'; end if;
  if (select status from li_messages where id = m) <> 'dropped' then raise exception 'FAIL dnc draft not dropped'; end if;
  raise notice 'PASS claim refuses a do_not_contact prospect and drops the draft';
end $$;

do $$
declare
  old_id bigint;
  new_id bigint;
  got bigint[];
begin
  insert into li_messages (kind, external_id, body, status, claimed_at, attempts)
    values ('reply', 'stuck-16', 'hi', 'sending', now() - interval '16 minutes', 1) returning id into old_id;
  insert into li_messages (kind, external_id, body, status, claimed_at, attempts)
    values ('reply', 'stuck-10', 'hi', 'sending', now() - interval '10 minutes', 1) returning id into new_id;
  select array_agg(x) into got from expire_stuck_sends() x;
  if got is distinct from array[old_id] then raise exception 'FAIL expire_stuck_sends returned %', got; end if;
  if (select status from li_messages where id = old_id) <> 'failed' then raise exception 'FAIL 16-minute row not failed'; end if;
  if (select status from li_messages where id = new_id) <> 'sending' then raise exception 'FAIL 10-minute row touched'; end if;
  -- the send turned out to have landed after all: the truth is recorded
  if finish_message(old_id, 'sent') <> 'sent' then raise exception 'FAIL late success on an expired row not recorded'; end if;
  raise notice 'PASS a 16-minute-old sending row becomes failed; a 10-minute one is left alone';
end $$;

truncate li_messages, li_prospects restart identity cascade;

do $$
declare
  n int;
begin
  insert into li_messages (kind, external_id, body, status, sent_at) values
    ('reply', 'd1', 'x', 'sent', now() - interval '1 hour'),
    ('reply', 'd2', 'x', 'sent', now() - interval '23 hours'),
    ('reply', 'd3', 'x', 'sent', now() - interval '25 hours'),
    ('reply', 'd4', 'x', 'draft', null),
    ('reply', 'd5', 'x', 'failed', null),
    ('comment_reply', 'd6', 'x', 'sent', now());
  insert into li_messages (kind, external_id, body, status, claimed_at) values
    ('reply', 'd7', 'x', 'sending', now());
  n := daily_count('reply');
  if n <> 3 then raise exception 'FAIL daily_count(reply) = %, expected 3', n; end if;
  if daily_count('comment_reply') <> 1 then raise exception 'FAIL daily_count(comment_reply)'; end if;
  begin
    perform daily_count('replies');
    raise exception 'FAIL daily_count accepted an unknown kind';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'PASS daily_count counts sent and mid-send rows in the rolling 24h, refuses unknown kinds';
end $$;

do $$
declare
  p bigint;
  m bigint;
begin
  insert into li_prospects (public_id, status) values ('streak', 'welcome_sent') returning id into p;
  insert into li_messages (prospect_id, kind, body, status, sent_at)
    values (p, 'welcome', 'w', 'sent', now() - interval '3 days');
  if unanswered_streak(p) <> 0 then raise exception 'FAIL the Aimfox welcome counted toward the streak'; end if;

  -- they wrote 48h ago; we answered at 47h, then again (mid-send) an hour ago
  update li_prospects set last_inbound_at = now() - interval '48 hours' where id = p;
  insert into li_messages (prospect_id, kind, external_id, body, status, sent_at, created_at)
    values (p, 'reply', 'in-1', 'r1', 'sent', now() - interval '47 hours', now() - interval '47 hours');
  if unanswered_streak(p) <> 1 then raise exception 'FAIL streak after one reply = %', unanswered_streak(p); end if;
  insert into li_messages (prospect_id, kind, external_id, body, status, claimed_at)
    values (p, 'reply', 'in-2', 'r2', 'sending', now() - interval '1 hour');
  if unanswered_streak(p) <> 2 then raise exception 'FAIL streak with two of ours = %', unanswered_streak(p); end if;

  -- a fresh draft must not reset the streak (it does not mean they wrote)
  insert into li_messages (prospect_id, kind, external_id, body) values (p, 'reply', 'in-3', 'r3') returning id into m;
  if unanswered_streak(p) <> 2 then raise exception 'FAIL a new draft reset the streak to %', unanswered_streak(p); end if;

  update li_prospects set last_inbound_at = now() - interval '30 minutes' where id = p;
  if unanswered_streak(p) <> 0 then raise exception 'FAIL last_inbound_at did not reset the streak'; end if;
  raise notice 'PASS unanswered_streak counts our replies since last_inbound_at; drafts and the welcome do not reset or count';
end $$;

truncate li_messages, li_prospects restart identity cascade;

do $$
declare
  p bigint;
  a bigint;
  c bigint;
  d bigint;
  r text;
begin
  insert into li_messages (kind, external_id, body, status, sent_at) values ('reply', 'cap-sent', 'x', 'sent', now() - interval '2 hours');
  insert into li_messages (kind, external_id, body, status, sent_at) values ('reply', 'cap-old', 'x', 'sent', now() - interval '25 hours');
  insert into li_messages (kind, external_id, body, status, sent_at) values ('comment_reply', 'cap-other', 'x', 'sent', now());
  insert into li_messages (kind, external_id, body) values ('reply', 'cap-a', 'x') returning id into a;
  insert into li_messages (kind, external_id, body) values ('reply', 'cap-c', 'x') returning id into c;

  r := claim_send(a, 1);
  if r <> 'cap' then raise exception 'FAIL at the cap claim_send gave %', r; end if;
  if (select status from li_messages where id = a) <> 'draft' then raise exception 'FAIL capped row is no longer a draft'; end if;
  r := claim_send(a, 2);
  if r <> 'claimed' then raise exception 'FAIL under the cap claim_send gave %', r; end if;
  r := claim_send(c, 2);
  if r <> 'cap' then raise exception 'FAIL mid-send row not counted toward the cap: %', r; end if;
  r := claim_send(a, 5);
  if r <> 'busy' then raise exception 'FAIL claiming a sending row gave %', r; end if;
  r := claim_send(999999, 5);
  if r <> 'busy' then raise exception 'FAIL a missing row gave %', r; end if;
  r := claim_send(c);
  if r <> 'claimed' then raise exception 'FAIL no cap given should claim, got %', r; end if;

  insert into li_prospects (public_id, status) values ('cap-stop', 'do_not_contact') returning id into p;
  insert into li_messages (prospect_id, kind, external_id, body) values (p, 'reply', 'cap-dnc', 'x') returning id into d;
  r := claim_send(d, 100);
  if r <> 'dropped' then raise exception 'FAIL do_not_contact claim gave %', r; end if;
  raise notice 'PASS claim_send: cap (rolling 24h, same kind, mid-send counts), claimed, busy, dropped';
end $$;
