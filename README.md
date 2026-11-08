# Illinois State Roleplay — Staff Portal

A self-hosted staff operations portal for an ER:LC community. It includes Discord OAuth sign-in, server-checked role access, SQLite-backed shifts and requests, management actions, a staff activity log, and an ER:LC map page. No demo players or fabricated live counts are inserted.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and fill in the required Discord settings below.
3. Run `npm install`, then `npm start` and open `http://localhost:3000`.
4. Keep `.env` and `illinois-portal.sqlite` private. Back up the SQLite database regularly.

## Discord sign-in and roles

Create an app in the Discord Developer Portal. For local setup, register `http://localhost:3000/auth/discord/callback` under **OAuth2 → General → Redirects**. The portal uses the `identify` scope. Keep the OAuth client secret and bot token separate. Invite the bot to your guild with `bot` and `applications.commands` scopes. Enable **Server Members Intent** and give it permission to see guild roles and members.

### Set up Discord OAuth

The Discord Developer Portal is open in the browser. Complete these steps there; enter credentials directly into your local `.env` file, not into chat:

1. Sign in to Discord, open **Applications**, and choose **New Application**.
2. Open **OAuth2 → General**. Add `http://localhost:3000/auth/discord/callback` to **Redirects**, then save. This must exactly match `BASE_URL/auth/discord/callback` in `.env`.
3. Copy the app's **Client ID** into `DISCORD_CLIENT_ID` and its **Client Secret** into `DISCORD_CLIENT_SECRET`.
4. Open **Bot**, create the bot user if Discord prompts you, copy its bot token to `DISCORD_BOT_TOKEN`, and enable **Server Members Intent**. Never share the token.
5. Under **OAuth2 → URL Generator**, select `bot` and `applications.commands`; choose only the bot permissions it needs, then use the generated URL to add it to your server.
6. In Discord, enable **User Settings → Advanced → Developer Mode**, then right-click your Illinois server and copy its ID to `DISCORD_GUILD_ID`. Right-click your Moderator role and copy its ID into `DISCORD_STAFF_ROLE_IDS`. Add manager and owner role IDs to their matching settings.
7. Put Moderator roles that may use ER:LC commands in `DISCORD_COMMAND_ROLE_IDS`. Save `.env`, then run `npm start` and `npm run bot` in two terminals.

For a hosted site, replace `BASE_URL` with its HTTPS address and register that exact callback URL in Discord before starting the website.

## Public hosting

`render.yaml` prepares a free Render web service that runs the portal and Discord bot together. Connect this repository to Render and create a Blueprint from `render.yaml`; provide the requested Discord, role, ER:LC, and optional OAuth/API values in Render's environment form. Secret values are deliberately absent from the YAML. The deploy creates a public `onrender.com` address, which becomes the default `BASE_URL`; after the first deploy, add that host's Discord callback (`/auth/discord/callback`) and Roblox callback (`/auth/roblox/callback`) to their respective OAuth app settings.

This uses Render's $0 Free instance. Free services can spin down after 15 minutes without inbound activity, have ephemeral storage, and cannot attach persistent disks. The local SQLite database and event log can be lost when the service restarts or redeploys, so do not rely on this free setup for permanent shift or audit history. The Discord bot may also be unavailable while the service is asleep. See [Render free service limits](https://render.com/docs/free).

Set the following in `.env`:

- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` — OAuth app credentials.
- `DISCORD_BOT_TOKEN` — bot token used only server-side to verify current guild membership and roles.
- `DISCORD_GUILD_ID` — the Illinois State Roleplay server ID.
- `DISCORD_STAFF_ROLE_IDS` — comma-separated role IDs allowed into staff pages (include Moderator roles here).
- `DISCORD_COMMAND_ROLE_IDS` — roles permitted to prepare ER:LC `/erlc command` actions (for example, your moderators).
- `DISCORD_ADMIN_ROLE_IDS` — role IDs allowed to edit/delete shifts and access management pages.
- `DISCORD_OWNER_ROLE_IDS` — owner role IDs with the same management access.
- `DISCORD_ASSIGNABLE_ROLE_IDS` — role IDs that authorized managers may add/remove in Promotions. Give the bot Manage Roles and place its highest role above only these permitted roles.
- `SESSION_SECRET` — a long random value. A temporary secret is generated if omitted, which resets sign-in sessions after a restart.

Access is checked against Discord when protected endpoints are requested. Removing a user’s configured role removes their portal access. Admin-only actions are enforced in the backend, not just hidden in the interface.

## Roblox account linking

Register a confidential OAuth app in Roblox Creator Hub with the `openid` and `profile` scopes and callback URL `BASE_URL/auth/roblox/callback`. Set both `ROBLOX_CLIENT_ID` and `ROBLOX_CLIENT_SECRET` in `.env`. After Discord sign-in, users without a linked Roblox account see a Login with Roblox step; linked accounts show their Roblox username on the portal profile. Only the Roblox account ID and username are stored. Roblox's `/oauth/v1/userinfo` response provides the stable user ID and profile name fields used by the callback.

## ER:LC live map

Set `ERLC_SERVER_KEY` to the private server key from the ER:LC API Pack. The server keeps it private and requests the official v2 server endpoint. Live names, teams, callsigns, and location coordinates appear only when the API returns them. Without a key, the map clearly shows that it is disconnected and does not render sample markers.

The portal uses the official [ER:LC v2 server API](https://apidocs.erlc.gg/api-reference/fetch-server-information). Roblox account linking follows Roblox's official [OAuth 2.0 flow](https://create.roblox.com/docs/cloud/auth/oauth2-overview).

`ERLC_MAP_IMAGE_URL` defaults to the ER:LC fall map asset. Marker placement uses configurable world-coordinate bounds (`ERLC_WORLD_MIN_X`, `ERLC_WORLD_MAX_X`, `ERLC_WORLD_MIN_Z`, `ERLC_WORLD_MAX_Z`; default -3000 to 3000). The API returns coordinates but does not publish image-alignment bounds, so verify and calibrate these values for the exact map image/season before treating marker positions as precise. To change the image, set `ERLC_MAP_IMAGE_URL` to an authentic ER:LC map image.

## Discord helper commands

The `/ask` command and bot mentions use OpenAI's Responses API when `OPENAI_API_KEY` is configured. The default model is `gpt-6-luna`; set `OPENAI_MODEL` to another model available to your API account if you prefer. If the key is blank or the API is unavailable, the bot automatically falls back to the built-in local helper. OpenAI responses are text-only; Discord and ER:LC actions still require the separate role checks and explicit command confirmation. Create your own API key in the OpenAI dashboard and put it in `.env`; never paste it into Discord or commit it. The bot also tracks Discord member role changes and channel create/delete/rename events, writes them to `server-events.jsonl`, and the portal shows those events on Overview.

For in-game messages and other ER:LC commands, set `ERLC_SERVER_KEY` and `DISCORD_COMMAND_ROLE_IDS`. Run `npm run bot` and use `/erlc command` with a command such as `:pm PlayerName Hello` or `:m Illinois State RP is starting`. The bot shows the exact command and requires a Confirm click, then rechecks the member's Discord role before sending it to the official ER:LC command endpoint. Kick/ban/shutdown type commands are limited to `DISCORD_ADMIN_ROLE_IDS` or owner roles. The bot needs Manage Roles only if you also want website promotions to update Discord roles; ER:LC command execution uses the ER:LC server key.

Mention the bot in a Discord server message to get a local helper reply; mentioning it with `ping` returns a Pong response. The website overview includes Request leave, live player selection for Log punishment, and a link to the live player map. Punishment logging records a staff action against a player currently returned by the ER:LC API; it does not execute a kick or ban command.

## What persists

SQLite stores staff profiles and linked Roblox IDs, shifts, leave requests, departments, applications, announcements, reports, and audit events. The owner/admin controls include editing or deleting shifts, reviewing requests and applications, managing department entries, publishing announcements, recording promotions/infractions, updating reports, and viewing audit history.

The web process and Discord bot run separately and share the same project folder and `.env`. Start the website with `npm start` and the bot with `npm run bot` in another terminal.

## Configuration example

See `.env.example`. Never publish OAuth secrets, the Discord bot token, or the ER:LC server key. Deploy behind HTTPS and set `BASE_URL` to the public HTTPS address.
