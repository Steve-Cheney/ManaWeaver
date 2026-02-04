import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
  } from "discord.js";
  
  type ScryfallCard = {
    name: string;
    scryfall_uri: string;
    released_at?: string;
    set_name?: string;
    set?: string;
    collector_number?: string;
    image_uris?: { normal?: string; large?: string };
    card_faces?: Array<{ image_uris?: { normal?: string; large?: string } }>;
  };
  
  type ScryfallList = { data: ScryfallCard[] };
  
  export const data = new SlashCommandBuilder()
    .setName("card_image")
    .setDescription("Return the most recent printing of a card with an image.")
    .addStringOption((opt) =>
      opt
        .setName("card_name")
        .setDescription("Card name (e.g. Lightning Bolt)")
        .setRequired(true)
    );
  
  function getImageUrl(card: ScryfallCard): string | undefined {
    if (card.image_uris?.large || card.image_uris?.normal) {
      return card.image_uris.large ?? card.image_uris.normal;
    }
    const face0 = card.card_faces?.[0];
    if (face0?.image_uris?.large || face0?.image_uris?.normal) {
      return face0.image_uris.large ?? face0.image_uris.normal;
    }
    return undefined;
  }
  
  async function fetchMostRecentPrinting(
    cardName: string
  ): Promise<ScryfallCard | null> {
    const q = `!"${cardName}"`;
    const url =
      "https://api.scryfall.com/cards/search" +
      `?q=${encodeURIComponent(q)}` +
      `&unique=prints&order=released&dir=desc`;
  
    const res = await fetch(url, {
      headers: { "User-Agent": "ManaWeaverBot/1.0" },
    });
  
    if (!res.ok) return null;
  
    const json = (await res.json()) as ScryfallList;
    return json?.data?.[0] ?? null;
  }
  
  export async function execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("card_name", true).trim();
  
    await interaction.deferReply();
  
    const card = await fetchMostRecentPrinting(name);
    if (!card) {
      await interaction.editReply(`Couldn't find **${name}** on Scryfall.`);
      return;
    }
  
    const embed = new EmbedBuilder()
      .setTitle(card.name)
      .setURL(card.scryfall_uri)
      .setFooter({ text: "Images & data via Scryfall" });
  
    const img = getImageUrl(card);
    if (img) embed.setImage(img);
  
    await interaction.editReply({ embeds: [embed] });
  }
  