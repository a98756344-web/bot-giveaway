require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    REST, 
    Routes, 
    ApplicationCommandOptionType,
    EmbedBuilder
} = require('discord.js');
const { GiveawaysManager } = require('discord-giveaways');

// Configurare Client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.Message, Partials.Reaction]
});

// Manager pentru Giveaway-uri cu mesaje customizate frumos
const manager = new GiveawaysManager(client, {
    storage: './giveaways.json',
    default: {
        botsCanWin: false,
        embedColor: '#5865F2', // Culoarea Blurple oficială Discord
        embedColorEnd: '#2F3136', // Culoare închisă elegantă la final
        reaction: '🎉',
        messages: {
            giveaway: '✨ ✨ **GIVEAWAY NOU** ✨ ✨',
            giveawayEnded: '🛑 **GIVEAWAY ÎNCHEIAT** 🛑',
            title: '🎁 Premiu: **{this.prize}**',
            drawing: '⏳ Timp rămas: {timestamp}',
            dropMessage: 'Fii primul care reacționează cu 🎉 pentru a câștiga!',
            inviteToParticipate: 'Apasă pe reacția 🎉 de mai jos ca să participi!',
            winMessage: '🏆 Felicitări, {winners}! Ai câștigat **{this.prize}**!\n🔗 Verifică aici: {this.messageURL}',
            embedFooter: 'Noroc tuturor! • {this.winnerCount} câștigător(i)',
            noWinner: 'Giveaway anulat, nu au fost destui participanți valizi.',
            hostedBy: '👑 Găzduit de: {this.hostedBy}',
            winners: '🎉 Câștigător(i):',
            endedAt: 'S-a încheiat la'
        }
    }
});
client.giveawaysManager = manager;

// Definire Comenzi Slash
const commands = [
    {
        name: 'start-giveaway',
        description: 'Pornește un giveaway nou și elegant',
        options: [
            {
                name: 'durata',
                description: 'Cât timp durează? (ex: 1m, 1h, 1d)',
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'castigatori',
                description: 'Câți câștigători vor fi extrași?',
                type: ApplicationCommandOptionType.Integer,
                required: true
            },
            {
                name: 'premiu',
                description: 'Care este premiul cel mare?',
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ]
    },
    {
        name: 'reroll-giveaway',
        description: 'Alege instant un alt câștigător',
        options: [
            {
                name: 'mesaj_id',
                description: 'ID-ul mesajului de giveaway',
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ]
    }
];

// Eveniment de pornire
client.once('ready', async () => {
    console.log(`✅ Aku este online ca ${client.user.tag}!`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Toate comenzile au fost încărcate în Discord!');
    } catch (error) {
        console.error(error);
    }
});

// Logica pentru interacțiuni (comenzi)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.member.permissions.has('ManageMessages')) {
        return interaction.reply({ content: '❌ Nu ai permisiunea `ManageMessages` pentru a folosi asta!', ephemeral: true });
    }

    if (interaction.commandName === 'start-giveaway') {
        const duration = interaction.options.getString('durata');
        const winnerCount = interaction.options.getInteger('castigatori');
        const prize = interaction.options.getString('premiu');

        await interaction.reply({ content: '⏳ Se generează giveaway-ul...', ephemeral: true });

        client.giveawaysManager.start(interaction.channel, {
            duration: require('ms')(duration),
            prize: prize,
            winnerCount: winnerCount,
            hostedBy: interaction.user
        }).then(() => {
            interaction.editReply({ content: '✅ Giveaway-ul a fost lansat cu succes!' });
        }).catch((err) => {
            interaction.editReply({ content: `❌ Eroare la pornire: ${err}` });
        });
    }

    if (interaction.commandName === 'reroll-giveaway') {
        const messageId = interaction.options.getString('mesaj_id');
        await interaction.reply({ content: '⏳ Se alege un nou câștigător...', ephemeral: true });

        client.giveawaysManager.reroll(messageId, {
            messages: {
                congrat: '🎉 Noul câștigător este {winners}! Ai câștigat **{this.prize}**!\n{this.messageURL}',
                error: 'Nu s-a putut efectua re-extragerea. Verifică dacă ID-ul este corect.'
            }
        }).then(() => {
            interaction.editReply({ content: '✅ Reroll finalizat!' });
        }).catch(() => {
            interaction.editReply({ content: `❌ Nu am putut găsi un giveaway terminat cu acest ID.` });
        });
    }
});

// SERVER WEB PENTRU RENDER (Rezolvă problema de port 24/7)
const http = require('http');
http.createServer((req, res) => {
    res.write("Aku Bot este activ 24/7!");
    res.end();
}).listen(process.env.PORT || 3000);

// Logare Bot
client.login(process.env.TOKEN);
