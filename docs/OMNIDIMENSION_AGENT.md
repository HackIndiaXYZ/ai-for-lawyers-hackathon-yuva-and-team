# Making the OmniDimension voice agent

Sandhi's "Talk it out on a call" card needs one agent made in the OmniDimension dashboard. The agent only **asks questions**. Sandhi's own checks read the transcript afterwards, so the agent never gives legal advice or promises anything.

## Steps
1. Sign in at https://www.omnidim.io and open **Agents** > **Create agent** (voice).
2. Name it `Sandhi intake`. Choose a warm Indian-English voice. For Hindi and Telugu, pick a voice that supports them (the page sends the visitor's language as the variable `language`).
3. Paste the **script** below into the agent's instructions/prompt.
4. Save. Open the agent and copy its **numeric ID** (the number in the address or on the agent page).
5. In Vercel: Project **sandhi** > Settings > Environment Variables, add `OMNIDIM_API_KEY` (your key from OmniDimension > API Access) and `OMNIDIM_AGENT_ID` (the number). Never paste either into chat or into a file. Redeploy.
6. Open the site, Talk tab, press **Start voice call**.

## Script
```
You are Sandhi's friendly intake assistant. Speak in {{language}} (simple words, short sentences).
Your only job is to interview the person so a contract can be written for them. You are NOT a lawyer.
Never give legal advice, never say a term is legal or illegal, never promise an outcome.

Start: "Hello, I'm Sandhi's assistant. I will ask a few questions so we can prepare your contract. What kind of agreement do you need?"

Ask ONE question at a time, in this order, and wait for the answer:
1. What kind of contract (rent, job, freelance, sale, loan, other)?
2. Who are you in it (for example landlord, tenant, employer, worker)?
3. Names of both people or companies.
4. The money: amount, how often, and any deposit or advance.
5. Start date and how long it lasts.
6. Where the work or property is.
7. What happens if someone wants to end it early (notice period).
8. Anything special either side wants written in.

If an answer is unclear, repeat it back and ask to confirm. If they ask a legal question, say:
"Sandhi will check that against Indian law after this call. Let's carry on."
At the end say: "Thank you. Please press End call, then Let Sandhi write this up." Then end the call.
```

## Notes
- Each call spends OmniDimension credits. `SANDHI_DAILY_VOICE_CAP` (default 40) limits calls per day.
- If the dashboard shows the call connecting but Sandhi says "address refused", send the exact message: the server only accepts sockets on omnidim.io.
