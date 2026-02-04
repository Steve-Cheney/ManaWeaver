import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
  
/**
 * Scryfall types (minimal fields we use)
*/
type ScryfallCard = {
    name: string;
    scryfall_uri: string;
    released_at?: string;
    set_name?: string;
    set?: string;
    collector_number?: string;
    rarity?: string;
    prices?: {
        usd?: string | null;
        usd_foil?: string | null;
        eur?: string | null;
    };
    image_uris?: { normal?: string; large?: string };
    card_faces?: Array<{
        name?: string;
        image_uris?: { normal?: string; large?: string };
    }>;
};

type ScryfallList = {
    object: "list";
    total_cards: number;
    data: ScryfallCard[];
};

export const data = new SlashCommandBuilder()
    .setName("card_image")
    .setDescription("Return the most recent printing of a card with an image.")
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

    // Exact card name
    parts.push(`!"${cardName}"`);

    // Optional set filters
    if (setCode && setCode.trim().length > 0) {
        parts.push(`set:${setCode.trim().toLowerCase()}`);
    }
    
    // Quote set name for multi-word sets
    if (setName && setName.trim().length > 0) {
        parts.push(`set:"${setName.trim()}"`);
    }

    return parts.join(" ");
}

async function fetchMostRecentPrinting(
    cardName: string,
    setCode?: string | null,
    setName?: string | null
): Promise<ScryfallCard | null> {
    const q = buildScryfallQuery(cardName, setCode, setName);

    const url =
        "https://api.scryfall.com/cards/search" +
        `?q=${encodeURIComponent(q)}` +
        `&unique=prints` +
        `&order=released` +
        `&dir=desc`;

    const res = await fetch(url, {
        headers: {
            // Nice to include a UA per Scryfall API guidance
            "User-Agent": "ManaWeaverBot/1.0",
            Accept: "application/json",
        },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as ScryfallList;
    return json?.data?.[0] ?? null;
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const cardName = interaction.options.getString("card_name", true).trim();
    const setCode = interaction.options.getString("set_code")?.trim() ?? null;
    const setName = interaction.options.getString("set_name")?.trim() ?? null;

    //await interaction.deferReply();

    const card = await fetchMostRecentPrinting(cardName, setCode, setName);

    if (!card) {
        const extra =
            setCode || setName
            ? ` (with filters: ${[
                setCode ? `Set Code=${setCode}` : null,
                setName ? `Set Name="${setName}"` : null,
            ]
            .filter(Boolean)
            .join(", ")})`
            : "";
        await interaction.reply({
            content: `Couldn't find **${cardName}** on Scryfall${extra}.`,
            ephemeral: true,
        });
    return;
    }
    await interaction.deferReply();
    
    const imageUrl = getImageUrl(card);

    const meta: string[] = [];
    if (card.set_name) meta.push(card.set_name);
    if (card.set && card.collector_number)
        meta.push(`${card.set.toUpperCase()} #${card.collector_number}`);
    if (card.released_at) meta.push(`Released: ${card.released_at}`);

    const embed = new EmbedBuilder()
        .setTitle(card.name)
        .setURL(card.scryfall_uri)
        .setFooter({ text: "Images & data via Scryfall" });

    if (meta.length) embed.setDescription(meta.join(" • "));
    if (imageUrl) embed.setImage(imageUrl);

    await interaction.editReply({ embeds: [embed] });
}