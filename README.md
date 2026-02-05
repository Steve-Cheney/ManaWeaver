<h1>
    <img src="/images/mw_logo.png" alt="ManaWeaver Logo" width="36" style="vertical-align: middle;">
    ManaWeaver
</h1>

**ManaWeaver** is a Discord bot for Magic: The Gathering players that lets you quickly **serch cards, view specific printings, see pricing, and jump straight to TCGplayer** — all powered by the Scryfall API.

It’s built with **TypeScript** and **discord.js**.

---

## Features

* 🔍 **Search Magic cards by name**
* 🗂 **Pick a specific printing** (set / collector number / release date)
* 🖼 **High-resolution card images**
* 💰 **Pricing (USD / EUR / Foil / Etched)**
* 🛒 **Direct “Buy from TCGplayer” button**
---

## Available Commands

### `/ping`

Basic health check.

```text
/ping
```

**Response**

```
Pong!
```

---

### `/scry`

The flagship ManaWeaver command.

```text
/scry card_name:<name> [set_code] [set_name]
```

**Example**

```text
/scry card_name:Rona, Disciple of Gix set_code:DOM
```

**How it works**

1. Searches Scryfall for all printings of the card
2. If there’s more than one valid printing:

   * You get an **ephemeral dropdown picker**
3. After selection:

   * A **public embed** is posted showing:

     * Card image
     * Printing info
     * Prices (USD / EUR / Foil / Etched)
     * 🛒 **Buy from TCGplayer** button

---

### `/card_image`

Fetches the **most recent printing** of a card and displays its image.

```text
/card_image card_name:<name> [set_code] [set_name]
```

**Example**

```text
/card_image card_name:Lightning Bolt
```

**What you get**

* Card image
* Set / collector number
* Release date

---


## Tech Stack

* **Node.js 24**
* **TypeScript**
* **discord.js**
* **Scryfall API**
* **TCGplayer pricing (via Scryfall)**

---

## Getting Started

### 1. Install Node.js (via NVM)

```bash
# Download and install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Load nvm without restarting shell
. "$HOME/.nvm/nvm.sh"

# Install Node.js 24
nvm install 24

# Verify versions
node -v   # v24.13.0
npm -v    # 11.6.2
```

---

### 2. Clone the repository

```bash
git clone https://github.com/yourusername/manaweaver.git
cd manaweaver
```

---

### 3. Install dependencies

```bash
npm install discord.js dotenv
npm install -D typescript tsx tsup
```

---

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_test_guild_id_here
```

> [!TIP]
> During development, registering slash commands to a single guild is **much faster** than global registration.

---

### 5. Run the bot

```bash
npm run dev
```

(or however you’ve wired `tsx` / `ts-node` in your scripts)

---

## API Usage

ManaWeaver uses the **Scryfall API** exclusively:

* Card search:

  ```
  GET https://api.scryfall.com/cards/search
  ```

* Pricing + purchase links:

  ```
  GET https://api.scryfall.com/cards/tcgplayer/:id
  ```

All pricing data is provided by Scryfall and reflects **aggregated market prices**, not live TCGplayer carts.

## Attribution

* Card images & data: **Scryfall**
* Pricing data: **Scryfall (via TCGplayer)**
* Magic: The Gathering is © Wizards of the Coast