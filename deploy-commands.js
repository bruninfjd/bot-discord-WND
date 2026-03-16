const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1482864616899084329";
const GUILD_ID = "1480048191536758867";

const commands = [

    new SlashCommandBuilder()
        .setName('ficha')
        .setDescription('Abrir ficha de recrutamento'),

    new SlashCommandBuilder()
        .setName('escalacao')
        .setDescription('Abrir painel de escalação')

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {

        console.log('🔄 Atualizando comandos...');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('✅ Comandos atualizados!');

    } catch (error) {
        console.error(error);
    }
})();