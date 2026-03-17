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

const LOGO_WK = "https://cdn.discordapp.com/attachments/1476789098231365817/1483081419314958530/Sem_Titulo-1.png?ex=69b9f374&is=69b8a1f4&hm=8431316f1bbc6847256a165b4b26e4552b017d71e10c77f4e9fc364f194af542&";

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

            if (interaction.customId === "aprovar") {
                const embed = interaction.message.embeds[0];
                const usuarioField = embed.fields.find(f => f.name === "Usuário");

                const userId = usuarioField.value.replace(/[<@>]/g, "");
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

            if (interaction.customId === "reprovar") {
                await interaction.update({
                    content: "❌ Ficha reprovada.",
                    embeds: [],
                    components: []
                });

                return;
            }

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

            if (interaction.customId.startsWith("participar_")) {
                const id = interaction.customId.split("_")[1];
                const esc = escalacoes.get(id);

                if (!esc) {
                    return interaction.reply({
                        content: "❌ Escalação não encontrada.",
                        ephemeral: true
                    });
                }

                if (esc.resultado !== "Em andamento") {
                    return interaction.reply({
                        content: "❌ Essa escalação já foi encerrada.",
                        ephemeral: true
                    });
                }

                if (esc.participantes.includes(interaction.user.id)) {
                    return interaction.reply({
                        content: "❌ Você já está na escalação.",
                        ephemeral: true
                    });
                }

                if (esc.participantes.length >= esc.limite) {
                    return interaction.reply({
                        content: "🚫 Escalação cheia.",
                        ephemeral: true
                    });
                }

                esc.participantes.push(interaction.user.id);
                return atualizarEscalacao(interaction, esc);
            }

            if (interaction.customId.startsWith("sair_")) {
                const id = interaction.customId.split("_")[1];
                const esc = escalacoes.get(id);

                if (!esc) {
                    return interaction.reply({
                        content: "❌ Escalação não encontrada.",
                        ephemeral: true
                    });
                }

                if (esc.resultado !== "Em andamento") {
                    return interaction.reply({
                        content: "❌ Essa escalação já foi encerrada.",
                        ephemeral: true
                    });
                }

                esc.participantes = esc.participantes.filter(u => u !== interaction.user.id);
                return atualizarEscalacao(interaction, esc);
            }

            if (interaction.customId.startsWith("vitoria_")) {
                const id = interaction.customId.split("_")[1];
                const esc = escalacoes.get(id);

                if (!esc) {
                    return interaction.reply({
                        content: "❌ Escalação não encontrada.",
                        ephemeral: true
                    });
                }

                esc.resultado = "Vitória";

                const canalRegistro = client.channels.cache.get(CANAL_REGISTRO);

                if (canalRegistro) {
                    const participantes = esc.participantes.length
                        ? esc.participantes.map(u => `<@${u}>`).join("\n")
                        : "Nenhum";

                    const embedRegistro = new EmbedBuilder()
                        .setTitle("🏆 Vitória Registrada")
                        .setColor("#57F287")
                        .setThumbnail(LOGO_WK)
                        .addFields(
                            { name: "Ação", value: `\`${esc.acao}\``, inline: false },
                            { name: "Responsável", value: `\`${interaction.member?.displayName || interaction.user.username}\``, inline: true },
                            { name: "Valor", value: `\`${esc.valor}\``, inline: true },
                            { name: "👥 Participantes", value: participantes, inline: false },
                            { name: "Registrado por", value: `\`${interaction.member?.displayName || interaction.user.username}\``, inline: false }
                        )
                        .setFooter({ text: "WK - Sistema de Escalação" })
                        .setTimestamp();

                    await canalRegistro.send({ embeds: [embedRegistro] });
                }

                return atualizarEscalacao(interaction, esc);
            }

            if (interaction.customId.startsWith("derrota_")) {
                const id = interaction.customId.split("_")[1];
                const esc = escalacoes.get(id);

                if (!esc) {
                    return interaction.reply({
                        content: "❌ Escalação não encontrada.",
                        ephemeral: true
                    });
                }

                esc.resultado = "Derrota";

                const canalRegistro = client.channels.cache.get(CANAL_REGISTRO);

                if (canalRegistro) {
                    const participantes = esc.participantes.length
                        ? esc.participantes.map(u => `<@${u}>`).join("\n")
                        : "Nenhum";

                    const embedRegistro = new EmbedBuilder()
                        .setTitle("💀 Derrota Registrada")
                        .setColor("#ED4245")
                        .setThumbnail(LOGO_WK)
                        .addFields(
                            { name: "Ação", value: `\`${esc.acao}\``, inline: false },
                            { name: "Responsável", value: `\`${interaction.member?.displayName || interaction.user.username}\``, inline: true },
                            { name: "Valor", value: `\`${esc.valor}\``, inline: true },
                            { name: "👥 Participantes", value: participantes, inline: false },
                            { name: "Registrado por", value: `\`${interaction.member?.displayName || interaction.user.username}\``, inline: false }
                        )
                        .setFooter({ text: "WK - Sistema de Escalação" })
                        .setTimestamp();

                    await canalRegistro.send({ embeds: [embedRegistro] });
                }

                return atualizarEscalacao(interaction, esc);
            }
        }

        if (interaction.isModalSubmit()) {
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

                const botoes = new ActionRowBuilder().addComponents(
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

            if (interaction.customId === "modal_escalacao") {
                const acao = interaction.fields.getTextInputValue("acao");
                const valor = interaction.fields.getTextInputValue("valor");
                const limite = parseInt(interaction.fields.getTextInputValue("limite"));

                if (isNaN(limite) || limite <= 0) {
                    return interaction.reply({
                        content: "❌ O limite precisa ser um número válido maior que 0.",
                        ephemeral: true
                    });
                }

                const idEsc = Date.now().toString();

                escalacoes.set(idEsc, {
                    acao,
                    valor,
                    limite,
                    criador: interaction.user.id,
                    participantes: [],
                    resultado: "Em andamento"
                });

                const embed = new EmbedBuilder()
                    .setTitle("🚨 Nova Escalação")
                    .addFields(
                        { name: "Ação", value: escTexto(acao) },
                        { name: "Valor", value: escTexto(valor) },
                        { name: "Participantes", value: "Nenhum" },
                        { name: "Vagas", value: `0/${limite}` },
                        { name: "Resultado", value: "Em andamento" }
                    )
                    .setColor("Blue")
                    .setThumbnail(LOGO_WK)
                    .setFooter({ text: "WK - Sistema de Escalação" })
                    .setTimestamp();

                const botoes1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`participar_${idEsc}`)
                        .setLabel("Participar")
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId(`sair_${idEsc}`)
                        .setLabel("Sair")
                        .setStyle(ButtonStyle.Secondary)
                );

                const botoes2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`vitoria_${idEsc}`)
                        .setLabel("Vitória")
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setCustomId(`derrota_${idEsc}`)
                        .setLabel("Derrota")
                        .setStyle(ButtonStyle.Danger)
                );

                const canal = client.channels.cache.get(CANAL_ESCALACAO);

                await canal.send({ embeds: [embed], components: [botoes1, botoes2] });

                await interaction.reply({
                    content: "✅ Escalação criada!",
                    ephemeral: true
                });
            }
        }
    } catch (err) {
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "❌ Ocorreu um erro ao processar essa interação.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});

function atualizarEscalacao(interaction, esc) {
    const participantes = esc.participantes.length
        ? esc.participantes.map(u => `<@${u}>`).join("\n")
        : "Nenhum";

    const embed = new EmbedBuilder()
        .setTitle("🚨 Nova Escalação")
        .setThumbnail(LOGO_WK)
        .addFields(
            { name: "Ação", value: escTexto(esc.acao) },
            { name: "Valor", value: escTexto(esc.valor) },
            { name: "Participantes", value: participantes },
            { name: "Vagas", value: `${esc.participantes.length}/${esc.limite}` },
            { name: "Resultado", value: esc.resultado }
        )
        .setColor(
            esc.resultado === "Vitória"
                ? "Green"
                : esc.resultado === "Derrota"
                ? "Red"
                : "Blue"
        )
        .setFooter({ text: "WK - Sistema de Escalação" })
        .setTimestamp();

    const idEsc = interaction.message.components[0]?.components[0]?.customId?.split("_")[1];

    const botoes1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`participar_${idEsc}`)
            .setLabel("Participar")
            .setStyle(ButtonStyle.Success)
            .setDisabled(esc.resultado !== "Em andamento"),

        new ButtonBuilder()
            .setCustomId(`sair_${idEsc}`)
            .setLabel("Sair")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(esc.resultado !== "Em andamento")
    );

    const botoes2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`vitoria_${idEsc}`)
            .setLabel("Vitória")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(esc.resultado !== "Em andamento"),

        new ButtonBuilder()
            .setCustomId(`derrota_${idEsc}`)
            .setLabel("Derrota")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(esc.resultado !== "Em andamento")
    );

    return interaction.update({
        embeds: [embed],
        components: [botoes1, botoes2]
    });
}

function escTexto(texto) {
    return texto && texto.trim() !== "" ? `\`${texto}\`` : "`Não informado`";
}

client.login(TOKEN);