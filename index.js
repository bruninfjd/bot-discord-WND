require("dotenv").config();

const { 
    Client,
    GatewayIntentBits,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    EmbedBuilder
} = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

const CANAL_ESCALACAO = "1480048194527301782";
const CANAL_REGISTRO = "1480048194527301783";
const CANAL_FICHAS = "1482875916467306517";

const CARGO_MEMBRO = "1480048191960256514";

const escalacoes = new Map();

client.once("ready", () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

    try {

        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === "escalacao") {

                const botao = new ButtonBuilder()
                    .setCustomId("criar_escalacao")
                    .setLabel("Criar Escalação")
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(botao);

                await interaction.reply({
                    content: "📋 **Painel de Escalação**",
                    components: [row]
                });
            }

            if (interaction.commandName === "ficha") {

                const botao = new ButtonBuilder()
                    .setCustomId("abrir_ficha")
                    .setLabel("Preencher ficha")
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(botao);

                await interaction.reply({
                    content: "📋 Clique no botão para preencher a ficha",
                    components: [row]
                });
            }

            return;
        }

        if (interaction.isButton()) {

            // ABRIR FICHA
            if (interaction.customId === "abrir_ficha") {

                const modal = new ModalBuilder()
                    .setCustomId("modal_ficha")
                    .setTitle("Ficha de Recrutamento");

                const id = new TextInputBuilder()
                    .setCustomId("id")
                    .setLabel("ID in game")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const nome = new TextInputBuilder()
                    .setCustomId("nome")
                    .setLabel("Nome in game")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const telefone = new TextInputBuilder()
                    .setCustomId("telefone")
                    .setLabel("Telefone in game")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const recrutador = new TextInputBuilder()
                    .setCustomId("recrutador")
                    .setLabel("Recrutado por")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(id),
                    new ActionRowBuilder().addComponents(nome),
                    new ActionRowBuilder().addComponents(telefone),
                    new ActionRowBuilder().addComponents(recrutador)
                );

                return interaction.showModal(modal);
            }

            // APROVAR FICHA
            if (interaction.customId === "aprovar") {

                const embed = interaction.message.embeds[0];

                const usuarioField = embed.fields.find(f => f.name === "Usuário");

                const userId = usuarioField.value.replace(/[<@>]/g, '');

                const membro = await interaction.guild.members.fetch(userId).catch(() => null);

                if (!membro) {
                    return interaction.reply({
                        content: "❌ Não consegui encontrar o usuário.",
                        ephemeral: true
                    });
                }

                await membro.roles.add(CARGO_MEMBRO);

                await interaction.update({
                    content: `✅ Ficha aprovada! ${membro} agora é membro.`,
                    embeds: [],
                    components: []
                });

                return;
            }

            // REPROVAR FICHA
            if (interaction.customId === "reprovar") {

                await interaction.update({
                    content: "❌ Ficha reprovada.",
                    embeds: [],
                    components: []
                });

                return;
            }

            // CRIAR ESCALAÇÃO
            if (interaction.customId === "criar_escalacao") {

                const modal = new ModalBuilder()
                    .setCustomId("modal_escalacao")
                    .setTitle("Nova Escalação");

                const acao = new TextInputBuilder()
                    .setCustomId("acao")
                    .setLabel("AÇÃO")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const valor = new TextInputBuilder()
                    .setCustomId("valor")
                    .setLabel("VALOR")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const limite = new TextInputBuilder()
                    .setCustomId("limite")
                    .setLabel("LIMITE DE PARTICIPANTES")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(acao),
                    new ActionRowBuilder().addComponents(valor),
                    new ActionRowBuilder().addComponents(limite)
                );

                return interaction.showModal(modal);
            }

            // PARTICIPAR
            if (interaction.customId.startsWith("participar_")) {

                const id = interaction.customId.split("_")[1];
                const esc = escalacoes.get(id);

                if (!esc) return;

                if (esc.participantes.includes(interaction.user.id))
                    return interaction.reply({ content: "❌ Você já está na escalação.", ephemeral: true });

                if (esc.participantes.length >= esc.limite)
                    return interaction.reply({ content: "🚫 Escalação cheia.", ephemeral: true });

                esc.participantes.push(interaction.user.id);

                atualizarEscalacao(interaction, esc);
            }

            // SAIR
            if (interaction.customId.startsWith("sair_")) {

                const id = interaction.customId.split("_")[1];
                const esc = escalacoes.get(id);

                esc.participantes = esc.participantes.filter(u => u !== interaction.user.id);

                atualizarEscalacao(interaction, esc);
            }

        }

        if (interaction.isModalSubmit()) {

            // ENVIO DA FICHA
            if (interaction.customId === "modal_ficha") {

                const id = interaction.fields.getTextInputValue("id");
                const nome = interaction.fields.getTextInputValue("nome");
                const telefone = interaction.fields.getTextInputValue("telefone");
                const recrutador = interaction.fields.getTextInputValue("recrutador");

                const embed = new EmbedBuilder()
                    .setTitle("📋 Nova Ficha de Recrutamento")
                    .addFields(
                        { name: "ID", value: id },
                        { name: "Nome", value: nome },
                        { name: "Telefone", value: telefone },
                        { name: "Recrutador", value: recrutador },
                        { name: "Usuário", value: `<@${interaction.user.id}>` }
                    )
                    .setColor("Yellow");

                const botoes = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("aprovar")
                            .setLabel("Aprovar")
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId("reprovar")
                            .setLabel("Reprovar")
                            .setStyle(ButtonStyle.Danger)
                    );

                const canal = client.channels.cache.get(CANAL_FICHAS);

                await canal.send({ embeds: [embed], components: [botoes] });

                await interaction.reply({
                    content: "✅ Sua ficha foi enviada para avaliação!",
                    ephemeral: true
                });
            }

            // CRIAR ESCALAÇÃO
            if (interaction.customId === "modal_escalacao") {

                const acao = interaction.fields.getTextInputValue("acao");
                const valor = interaction.fields.getTextInputValue("valor");
                const limite = parseInt(interaction.fields.getTextInputValue("limite"));

                const idEsc = Date.now().toString();

                escalacoes.set(idEsc, {
                    acao,
                    valor,
                    limite,
                    criador: interaction.user.id,
                    participantes: []
                });

                const embed = new EmbedBuilder()
                    .setTitle("🚨 Nova Escalação")
                    .addFields(
                        { name: "Ação", value: acao },
                        { name: "Valor", value: valor },
                        { name: "Participantes", value: "Nenhum" },
                        { name: "Vagas", value: `0/${limite}` }
                    )
                    .setColor("Blue");

                const botoes = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`participar_${idEsc}`)
                            .setLabel("Participar")
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId(`sair_${idEsc}`)
                            .setLabel("Sair")
                            .setStyle(ButtonStyle.Secondary)
                    );

                const canal = client.channels.cache.get(CANAL_ESCALACAO);

                await canal.send({ embeds: [embed], components: [botoes] });

                await interaction.reply({ content: "✅ Escalação criada!", ephemeral: true });
            }

        }

    } catch (err) {
        console.error(err);
    }

});

function atualizarEscalacao(interaction, esc) {

    const participantes = esc.participantes.map(u => `<@${u}>`).join("\n") || "Nenhum";

    const embed = new EmbedBuilder()
        .setTitle("🚨 Nova Escalação")
        .addFields(
            { name: "Ação", value: esc.acao },
            { name: "Valor", value: esc.valor },
            { name: "Participantes", value: participantes },
            { name: "Vagas", value: `${esc.participantes.length}/${esc.limite}` }
        )
        .setColor("Blue");

    interaction.update({ embeds: [embed] });
}

client.login(TOKEN);