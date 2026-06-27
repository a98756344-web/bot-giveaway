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
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Reaction]
});

// Sistem de salvare permanentă pe RENDER DISK (modificat în /data/)
const MESSAGES_FILE = '/data/messages.json';
let messageCounts = {};

if (fs.existsSync(MESSAGES_FILE)) {
    try {
        messageCounts = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    } catch (e) {
        messageCounts = {};
    }
}

function saveMessages() {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messageCounts, null, 2));
}

// Monitorizare mesaje trimise
client.on('messageCreate', (message) => {
    if (message.author.bot || !message.guild) return;
    
    const key = `${message.guild.id}-${message.author.id}`;
    messageCounts[key] = (messageCounts[key] || 0) + 1;
    
    saveMessages();
});

// Manager Giveaway-uri pe RENDER DISK (modificat în /data/)
const manager = new GiveawaysManager(client, {
    storage: '/data/giveaways.json',
    default: {
        botsCanWin: false,
        embedColor: '#5865F2', 
        embedColorEnd: '#2F3136', 
        reaction: '🎉',
        messages: {
            giveaway: '✨ **GIVEAWAY ACTIV** ✨',
            giveawayEnded: '🛑 **GIVEAWAY ÎNCHEIAT** 🛑',
            title: '🎁 Premiu: `{this.prize}`',
            drawing: '⏳ Se extrage în: {timestamp}',
            inviteToParticipate: 'Apasă pe reacția 🎉 de mai jos pentru a intra în cursă!',
            winMessage: '🏆 Felicitări, {winners}! Ai câștigat **{this.prize}**!\n🔗 Mesaj: {this.messageURL}',
            embedFooter: 'Aku System • {this.winnerCount} câștigător(i)',
            noWinner: 'Giveaway anulat, nu există participanți care să bifeze toate cerințele.',
            hostedBy: '👑 Găzduit de: {this.hostedBy}',
            winners: '🎉 Câștigător(i):',
            endedAt: 'Finalizat la'
        }
    }
});
client.giveawaysManager = manager;

client.on('ready', async () => {
    console.log(`✅ Aku este online ca ${client.user.tag}!`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Toate comenzile au fost încărcate în Discord!');
    } catch (error) {
        console.error(error);
    }
});

const commands = [
    {
        name: 'start-giveaway',
        description: 'Pornește un giveaway cu verificări automate de rol, mesaje sau invitații',
        options: [
            { name: 'durata', description: 'Cât timp durează? (ex: 1m, 1h, 1d)', type: ApplicationCommandOptionType.String, required: true },
            { name: 'castigatori', description: 'Câți câștigători vor fi extrași?', type: ApplicationCommandOptionType.Integer, required: true },
            { name: 'premiu', description: 'Care este premiul cel mare?', type: ApplicationCommandOptionType.String, required: true },
            { name: 'mesaj_suplimentar', description: 'Pune un mesaj text deasupra giveaway-ului (ex: @everyone)', type: ApplicationCommandOptionType.String, required: false },
            { name: 'rol_necesar', description: 'Rolul obligatoriu pentru a participa', type: ApplicationCommandOptionType.Role, required: false },
            { name: 'mesaje_minime', description: 'Numărul de mesaje trimise necesar', type: ApplicationCommandOptionType.Integer, required: false },
            { name: 'invitatii_minime', description: 'Numărul de invitații necesar', type: ApplicationCommandOptionType.Integer, required: false }
        ]
    },
    {
        name: 'stats',
        description: 'Vezi numărul tău de mesaje trimise și invitații pe acest server'
    }
];

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'stats') {
        const msgKey = `${interaction.guild.id}-${interaction.user.id}`;
        const totalMessages = messageCounts[msgKey] || 0;

        let totalInvites = 0;
        try {
            const currentInvites = await interaction.guild.invites.fetch();
            currentInvites.forEach(inv => {
                if (inv.inviter && inv.inviter.id === interaction.user.id) {
                    totalInvites += inv.uses;
                }
            });
        } catch (err) {
            totalInvites = 0;
        }

        const statsEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 Statistici de Activitate — ${interaction.user.username}`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '💬 Mesaje Trimise', value: `\`${totalMessages}\` mesaje`, inline: true },
                { name: '👥 Invitații Valide', value: `\`${totalInvites}\` persoane invitate`, inline: true }
            )
            .setFooter({ text: 'Aku Core System', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.reply({ embeds: [statsEmbed] });
    }

    if (interaction.commandName === 'start-giveaway') {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ Nu ai permisiunea necesară!', ephemeral: true });
        }

        const duration = interaction.options.getString('durata');
        const winnerCount = interaction.options.getInteger('castigatori');
        const prize = interaction.options.getString('premiu');
        const customMessage = interaction.options.getString('mesaj_suplimentar');
        const requiredRole = interaction.options.getRole('rol_necesar');
        const minMessages = interaction.options.getInteger('mesaje_minime') || 0;
        const minInvites = interaction.options.getInteger('invitatii_minime') || 0;

        await interaction.reply({ content: '⏳ Se configurează giveaway-ul...', ephemeral: true });

        const customMessagesConfig = { ...manager.options.default.messages };
        
        let cerinteText = '';
        if (requiredRole) cerinteText += `• Rol necesar: ${requiredRole}\n`;
        if (minMessages > 0) cerinteText += `• Mesaje minime scrise: \`${minMessages}\`\n`;
        if (minInvites > 0) cerinteText += `• Invitații minime create: \`${minInvites}\`\n`;

        if (cerinteText.length > 0) {
            customMessagesConfig.inviteToParticipate = `⚠️ **Cerințe obligatorii de participare:**\n${cerinteText}\n*Sistemul va verifica automat dacă îndeplinești condițiile în momentul extragerii!*`;
        }

        const options = {
            duration: require('ms')(duration),
            prize: prize,
            winnerCount: winnerCount,
            hostedBy: interaction.user,
            messages: customMessagesConfig,
            exemptMembers: async (member) => {
                if (requiredRole && !member.roles.cache.has(requiredRole.id)) return true;

                if (minMessages > 0) {
                    const msgKey = `${member.guild.id}-${member.id}`;
                    const userMessages = messageCounts[msgKey] || 0;
                    if (userMessages < minMessages) return true;
                }

                if (minInvites > 0) {
                    let userInvites = 0;
                    try {
                        const guildInvites = await member.guild.invites.fetch();
                        guildInvites.forEach(inv => {
                            if (inv.inviter && inv.inviter.id === member.id) {
                                userInvites += inv.uses;
                            }
                        });
                    } catch {
                        userInvites = 0;
                    }
                    if (userInvites < minInvites) return true;
                }

                return false;
            }
        };

        if (customMessage) {
            await interaction.channel.send({ content: customMessage });
        }

        client.giveawaysManager.start(interaction.channel, options).then(() => {
            interaction.editReply({ content: '✅ Giveaway-ul a fost lansat cu succes!' });
        }).catch((err) => {
            interaction.editReply({ content: `❌ Eroare la pornire: ${err}` });
        });
    }
});

const http = require('http');
http.createServer((req, res) => {
    res.write("Aku Bot Custom este activ 24/7!");
    res.end();
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
