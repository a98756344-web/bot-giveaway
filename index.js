require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    REST, 
    Routes, 
    ApplicationCommandOptionType 
} = require('discord.js');
const { GiveawaysManager } = require('discord-giveaways');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.Message, Partials.Reaction]
});

const manager = new GiveawaysManager(client, {
    storage: './giveaways.json',
    default: {
        botsCanWin: false,
        embedColor: '#FF0055',
        embedColorEnd: '#36393F',
        reaction: '🎉',
        messages: {
            giveaway: '🎉 **GIVEAWAY NOU** 🎉',
            giveawayEnded: '🛑 **GIVEAWAY ÎNCHEIAT** 🛑',
            title: '{this.prize}',
            drawing: 'Extragerea are loc în: {timestamp}',
            dropMessage: 'Fii primul care reacționează cu 🎉 pentru a câștiga!',
            inviteToParticipate: 'Apasă pe reacția 🎉 pentru a participa!',
            winMessage: 'Felicitări, {winners}! Ai câștigat **{this.prize}**!\n{this.messageURL}',
            embedFooter: '{this.winnerCount} câștigător(i)',
            noWinner: 'Giveaway anulat, nu au fost destui participanți validați.',
            hostedBy: 'Găzduit de: {this.hostedBy}',
            winners: 'Câștigător(i):',
            endedAt: 'S-a terminat la'
        }
    }
});
client.giveawaysManager = manager;

const commands = [
    {
        name: 'start-giveaway',
        description: 'Pornește un giveaway nou',
        options: [
            {
                name: 'durata',
                description: 'Cât timp durează? (ex: 1m, 1h, 1d)',
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'castigatori',
                description: 'Câți câștigători vor fi?',
                type: ApplicationCommandOptionType.Integer,
                required: true
            },
            {
                name: 'premiu',
                description: 'Ce se câștigă?',
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ]
    },
    {
        name: 'reroll-giveaway',
        description: 'Alege un alt câștigător pentru un giveaway terminat',
        options: [
            {
                name: 'mesaj_id',
                description: 'ID-ul mesajului cu giveaway-ul',
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ]
    }
];

client.once('ready', async () => {
    console.log(`✅ Logat ca ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comenzi încărcate pe Discord!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.member.permissions.has('ManageMessages')) {
        return interaction.reply({ content: '❌ Nu ai permisiunea necesară!', ephemeral: true });
    }

    if (interaction.commandName === 'start-giveaway') {
        const duration = interaction.options.getString('durata');
        const winnerCount = interaction.options.getInteger('castigatori');
        const prize = interaction.options.getString('premiu');

        await interaction.reply({ content: 'Se pregătește giveaway-ul...', ephemeral: true });

        client.giveawaysManager.start(interaction.channel, {
            duration: require('ms')(duration),
            prize: prize,
            winnerCount: winnerCount,
            hostedBy: interaction.user
        }).then(() => {
            interaction.editReply({ content: '✅ Giveaway-ul a început!' });
        }).catch((err) => {
            interaction.editReply({ content: `❌ Eroare: ${err}` });
        });
    }

    if (interaction.commandName === 'reroll-giveaway') {
        const messageId = interaction.options.getString('mesaj_id');
        await interaction.reply({ content: 'Se alege un nou câștigător...', ephemeral: true });

        client.giveawaysManager.reroll(messageId, {
            messages: {
                congrat: '🎉 Noul câștigător este {winners}! Ai câștigat **{this.prize}**!\n{this.messageURL}',
                error: 'Nu s-a putut face reroll.'
            }
        }).then(() => {
            interaction.editReply({ content: '✅ Reroll efectuat!' });
        }).catch(() => {
            interaction.editReply({ content: `❌ Nu am putut găsi giveaway-ul.` });
        });
    }
});

client.login(process.env.TOKEN);
