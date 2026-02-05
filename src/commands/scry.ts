import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from "discord.js";

/**
 * Minimal Scryfall fields we need for prompting + TCGplayer ID + prices + image.
 */
type ScryfallCard = {
    id: string;
    name: string;
    scryfall_uri: string;
    released_at?: string;
    set_name?: string;
    set?: string;
    collector_number?: string;
    rarity?: string;

    tcgplayer_id?: number | null;

    prices?: {
        usd?: string | null;
        usd_foil?: string | null;
        usd_etched?: string | null;
        eur?: string | null;
        eur_foil?: string | null;
        tix?: string | null;
    };

    image_uris?: { normal?: string; large?: string };
    card_faces?: Array<{
        name?: string;
        image_uris?: { normal?: string; large?: string };
    }>;

    purchase_uris?: {
        tcgplayer?: string;
        cardmarket?: string;
        cardhoarder?: string;
    };
};

type ScryfallList = {
    object: "list";
    total_cards: number;
    has_more?: boolean;
    next_page?: string;
    data: ScryfallCard[];
};

export const data = new SlashCommandBuilder()
    .setName("scry")
    .setDescription("Scry a card's desired printing.")
    .addStringOption((opt) =>
        opt
            .setName("card_name")
            .setDescription("Card name (e.g. Lightning Bolt)")
            .setRequired(true)
    )
    .addStringOption((opt) =>
        opt
            .setName("set_code")
            .setDescription("Optional set code (e.g. MH3, LTR)")
            .setRequired(false)
    )
    .addStringOption((opt) =>
        opt
            .setName("set_name")
            .setDescription('Optional set name (e.g. "Ice Age")')
            .setRequired(false)
    );

function getImageUrl(card: ScryfallCard): string | undefined {
    // Normal single-faced card
    if (card.image_uris?.large || card.image_uris?.normal) {
        return card.image_uris.large ?? card.image_uris.normal;
    }

    // Double-faced / modal cards: use first face image if present
    const face0 = card.card_faces?.[0];
    if (face0?.image_uris?.large || face0?.image_uris?.normal) {
        return face0.image_uris.large ?? face0.image_uris.normal;
    }

    return undefined;
}

function buildScryfallQuery(
    cardName: string,
    setCode?: string | null,
    setName?: string | null
): string {
    const parts: string[] = [];
    parts.push(`!"${cardName}"`);

    if (setCode && setCode.trim().length > 0) {
        parts.push(`set:${setCode.trim().toLowerCase()}`);
    }
    if (setName && setName.trim().length > 0) {
        parts.push(`set:"${setName.trim()}"`);
    }

    return parts.join(" ");
}

function printingLabel(card: ScryfallCard): string {
    const bits: string[] = [];
    if (card.set_name) bits.push(card.set_name);
    if (card.set && card.collector_number) {
        bits.push(`${card.set.toUpperCase()} #${card.collector_number}`);
    } else if (card.set) {
        bits.push(card.set.toUpperCase());
    }
    if (card.released_at) bits.push(`Released: ${card.released_at}`);
    return bits.filter(Boolean).join(" • ") || card.name;
}

function formatPriceLine(
    label: string,
    v?: string | null,
    prefix = "$"
): string {
    return `${label}: ${v ? `${prefix}${v}` : "—"}`;
}

function buildPricesBlock(card: ScryfallCard): string {
    const p = card.prices ?? {};
    const lines: string[] = [];

    lines.push(
        [
            formatPriceLine("USD", p.usd, "$"),
            formatPriceLine("Foil", p.usd_foil, "$"),
            formatPriceLine("Etched", p.usd_etched, "$"),
        ].join("  |  ")
    );

    lines.push(
        [
            formatPriceLine("EUR", p.eur, "€"),
            formatPriceLine("Foil", p.eur_foil, "€"),
        ].join("  |  ")
    );

    // Optional: MTGO tix if present
    if (p.tix) lines.push(`Tix: ${p.tix}`);

    return lines.join("\n");
}

async function fetchPrintings(
    cardName: string,
    setCode?: string | null,
    setName?: string | null,
    maxResults = 50
): Promise<ScryfallCard[]> {
    const q = buildScryfallQuery(cardName, setCode, setName);

    let url =
        "https://api.scryfall.com/cards/search" +
        `?q=${encodeURIComponent(q)}` +
        `&unique=prints` +
        `&order=released` +
        `&dir=desc`;

    const out: ScryfallCard[] = [];

    while (url && out.length < maxResults) {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "ManaWeaverBot/1.0",
                Accept: "application/json",
            },
        });

        if (!res.ok) break;

        const json = (await res.json()) as ScryfallList;
        if (!json?.data?.length) break;

        out.push(...json.data);

        if (!json.has_more || !json.next_page) break;
        url = json.next_page;
    }

    return out.slice(0, maxResults);
}

/**
 * Fetch Scryfall card by tcgplayer productId. Includes prices + purchase_uris.
 * Endpoint: GET https://api.scryfall.com/cards/tcgplayer/:id
 */
async function fetchByTcgplayerId(
    tcgplayerId: number
): Promise<ScryfallCard | null> {
    const url = `https://api.scryfall.com/cards/tcgplayer/${tcgplayerId}`;

    const res = await fetch(url, {
        headers: {
            "User-Agent": "ManaWeaverBot/1.0",
            Accept: "application/json",
        },
    });

    if (!res.ok) return null;
    return (await res.json()) as ScryfallCard;
}

function buildEmbedAndComponents(card: ScryfallCard): {
    embed: EmbedBuilder;
    components: ActionRowBuilder<ButtonBuilder>[];
} {
    const imageUrl = getImageUrl(card);

    const meta: string[] = [];
    if (card.set_name) meta.push(card.set_name);
    if (card.set && card.collector_number) {
        meta.push(`${card.set.toUpperCase()} #${card.collector_number}`);
    } else if (card.set) {
        meta.push(card.set.toUpperCase());
    }
    if (card.released_at) meta.push(`Released: ${card.released_at}`);
    if (card.rarity) meta.push(`Rarity: ${card.rarity}`);

    const pricesBlock = buildPricesBlock(card);

    const embed = new EmbedBuilder()
        .setTitle(card.name)
        .setURL(card.scryfall_uri)
        .setFooter({ text: "Images & data via Scryfall" });

    if (meta.length) embed.setDescription(meta.join(" • "));
    if (imageUrl) embed.setImage(imageUrl);

    embed.addFields({
        name: "Prices (via Scryfall)",
        value: "```" + pricesBlock + "```",
        inline: false,
    });

    const components: ActionRowBuilder<ButtonBuilder>[] = [];

    if (card.purchase_uris?.tcgplayer) {
        const buyButton = new ButtonBuilder()
            .setLabel("Buy from TCGplayer")
            .setEmoji("🛒")
            .setStyle(ButtonStyle.Link)
            .setURL(card.purchase_uris.tcgplayer);

        components.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(buyButton)
        );
    }

    return { embed, components };
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const cardName = interaction.options.getString("card_name", true).trim();
    const setCode = interaction.options.getString("set_code")?.trim() ?? null;
    const setName = interaction.options.getString("set_name")?.trim() ?? null;

    // Picker is ephemeral; final result is posted publicly via followUp()
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const printings = await fetchPrintings(cardName, setCode, setName, 50);

    if (!printings.length) {
        const extra =
            setCode || setName
                ? ` (with filters: ${[
                      setCode ? `Set Code=${setCode}` : null,
                      setName ? `Set Name="${setName}"` : null,
                  ]
                      .filter(Boolean)
                      .join(", ")})`
                : "";
        await interaction.editReply(
            `Couldn't find **${cardName}** on Scryfall${extra}.`
        );
        return;
    }

    const withTcg = printings.filter((c) => typeof c.tcgplayer_id === "number");
    if (!withTcg.length) {
        await interaction.editReply(
            `Found printings for **${cardName}**, but none include a TCGplayer ID on Scryfall.`
        );
        return;
    }

    const publishResult = async (chosen: ScryfallCard) => {
        const tcgId = chosen.tcgplayer_id!;
        const enrichedCard = (await fetchByTcgplayerId(tcgId)) ?? chosen;

        const { embed, components } = buildEmbedAndComponents(enrichedCard);

        // Public post
        await interaction.followUp({
            embeds: [embed],
            components,
        });
    };

    // If only one distinct TCGplayer ID, skip picker
    const distinctIds = new Set(withTcg.map((c) => c.tcgplayer_id));
    if (distinctIds.size === 1) {
        await publishResult(withTcg[0]);

        await interaction.editReply({
            content: "Posted result ✅",
            components: [],
        });
        return;
    }

    // Select menu (max 25)
    const options = withTcg.slice(0, 25).map((c) => ({
        label: (c.set_name ?? c.name).slice(0, 100),
        description: printingLabel(c).slice(0, 100),
        value: c.id, // scryfall printing id
    }));

    const customId = `tcg_pick:${interaction.id}`;

    const menu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder("Pick a printing…")
        .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        menu
    );

    await interaction.editReply({
        content:
            `Multiple printings found for **${withTcg[0].name}**.\n` +
            `Select the printing you want (showing up to 25 most recent):`,
        components: [row],
    });

    let pick: StringSelectMenuInteraction;
    try {
        pick = await interaction.channel!.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: 60_000,
            filter: (i) =>
                i.customId === customId && i.user.id === interaction.user.id,
        });
    } catch {
        await interaction.editReply({
            content:
                "Timed out waiting for a selection. Run the command again.",
            components: [],
        });
        return;
    }

    const selectedScryfallId = pick.values[0];
    const chosen = withTcg.find((c) => c.id === selectedScryfallId);

    if (!chosen || !chosen.tcgplayer_id) {
        await pick.update({
            content:
                "Couldn't resolve that selection (or it had no TCGplayer ID). Try again.",
            components: [],
        });
        return;
    }

    await publishResult(chosen);

    // Clear ephemeral picker UI
    await pick.update({
        content: "Posted result ✅",
        components: [],
    });
}
