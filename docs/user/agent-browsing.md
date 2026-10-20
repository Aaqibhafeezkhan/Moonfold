# Agent browsing

Agents can open web pages in Moonfold's browser and work with them. **Settings → Integrations →
Agent browsing** decides what they may do on each site:

- **Opening sites**: when an agent opens a page or navigates to one.
- **Uploading files**: when an agent hands a page files from the environment's machine.

Each can be **Allow**, **Ask** or **Block**. Out of the box, agents may open any site and Moonfold
asks before every upload. Pages served by this machine (localhost) are always allowed.

## Rules for one site

Under **Add a site**, type a site such as `example.com` (pasting a full address works too) and
choose what applies. A rule covers the site's subdomains, and the most specific rule wins: a rule
for `docs.example.com` overrides one for `example.com`. Change or remove a rule from its row.

## When Moonfold asks

When a rule says **Ask**, Moonfold shows which thread wants to open or upload to which page, and
the agent waits up to five minutes for your answer:

- **Allow once** lets this one action through.
- **Allow in this chat** lets the thread do the same on that site until Moonfold restarts.
- **Always allow** and **Always block** save a rule for the site.
- **Deny**, or closing the question, refuses this one action.

Rules also follow the agent: before each action in a tab, and again after a click, key press or
script that may have moved the tab, Moonfold checks the page the tab is on. An agent that lands on
a blocked site through a redirect or a link can't keep working there. The action that carried it
there has already happened, so block a site you never want agents on rather than relying on
asking.
