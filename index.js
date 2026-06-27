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

const MESSAGES_FILE = './messages.json';
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

client.on('messageCreate', (message) => {
    if (message.author.bot || !message.guild) return;
    const key = `${message.guild.id}-${message.author.id}`;
    messageCounts[key] = (messageCounts[key] || 0) + 1;
    saveMessages();
});

const manager = new GiveawaysManager(client, {
    storage: './giveaways.json',
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
        name: 'edit-giveaway',
        description: 'Editează un giveaway sau cerințele lui din mers',
        options: [
            { name: 'id_mesaj', description: 'ID-ul mesajului de giveaway pe care vrei să-l editezi', type: ApplicationCommandOptionType.String, required: true },
            { name: 'premiu_nou', description: 'Schimbă premiul (opțional)', type: ApplicationCommandOptionType.String, required: false },
            { name: 'castigatori_noi', description: 'Schimbă numărul de câștigători (opțional)', type: ApplicationCommandOptionType.Integer, required: false },
            { name: 'adauga_timp', description: 'Adaugă timp suplimentar (ex: 5m, 1h) (opțional)', type: ApplicationCommandOptionType.String, required: false },
            { name: 'mesaje_minime_noi', description: 'Schimbă numărul nou de mesaje minime (opțional)', type: ApplicationCommandOptionType.Integer, required: false },
            { name: 'invitatii_minime_noi', description: 'Schimbă numărul nou de invitații minime (opțional)', type: ApplicationCommandOptionType.Integer, required: false },
            { name: 'rol_necesar_nou', description: 'Schimbă rolul obligatoriu (opțional)', type: ApplicationCommandOptionType.Role, required: false }
        ]
    },
    {
        name: 'end-giveaway',
        description: 'Termină un giveaway IMEDIAT și extrage câștigătorii pe loc',
        options: [
            { name: 'id_mesaj', description: 'ID-ul mesajului de giveaway', type: ApplicationCommandOptionType.String, required: true }
        ]
    },
    {
        name: 'cancel-giveaway',
        description: 'Anulează un giveaway complet (se oprește fără câștigători)',
        options: [
            { name: 'id_mesaj', description: 'ID-ul mesajului de giveaway', type: ApplicationCommandOptionType.String, required: true }
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
            extraData: {
                minMessages: minMessages,
                minInvites: minInvites,
                requiredRoleId: requiredRole ? requiredRole.id : null
            },
            exemptMembers: async (member, giveaway) => {
                const reqRoleId = giveaway.extraData?.requiredRoleId;
                const minMsgs = giveaway.extraData?.minMessages || 0;
                const minInvs = giveaway.extraData?.minInvites || 0;

                if (reqRoleId && !member.roles.cache.has(reqRoleId)) return true;

                if (minMsgs > 0) {
                    const msgKey = `${member.guild.id}-${member.id}`;
                    const userMessages = messageCounts[msgKey] || 0;
                    if (userMessages < minMsgs) return true;
                }

                if (minInvs > 0) {
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
                    if (userInvites < minInvs) return true;
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

    // Editare din mers (Inclusiv cerintele de mesaje/roluri)
    if (interaction.commandName === 'edit-giveaway') {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ Fără permisiuni!', ephemeral: true });
        }

        const messageId = interaction.options.getString('id_mesaj');
        const newPrize = interaction.options.getString('premiu_nou');
        const newWinners = interaction.options.getInteger('castigatori_noi');
        const addTime = interaction.options.getString('adauga_timp');
        const newMinMsgs = interaction.options.getInteger('mesaje_minime_noi');
        const newMinInvs = interaction.options.getInteger('invitatii_minime_noi');
        const newRole = interaction.options.getRole('rol_necesar_nou');

        await interaction.reply({ content: '⏳ Se modifică datele...', ephemeral: true });

        const giveaway = client.giveawaysManager.giveaways.find((g) => g.messageId === messageId);
        if (!giveaway) return interaction.editReply({ content: '❌ Giveaway-ul nu a fost găsit.' });

        const currentExtraData = giveaway.extraData || {};
        if (newMinMsgs !== null) currentExtraData.minMessages = newMinMsgs;
        if (newMinInvs !== null) currentExtraData.minInvites = newMinInvs;
        if (newRole !== null) currentExtraData.requiredRoleId = newRole ? newRole.id : null;

        const editOptions = {
            newExtraData: currentExtraData
        };
        if (newPrize) editOptions.newPrize = newPrize;
        if (newWinners) editOptions.newWinnerCount = newWinners;
        if (addTime) editOptions.addTime = require('ms')(addTime);

        client.giveawaysManager.edit(messageId, editOptions).then(() => {
            interaction.editReply({ content: '✅ Cerințele și datele giveaway-ului au fost actualizate din mers!' });
        }).catch((err) => {
            interaction.editReply({ content: `❌ Eroare la editare: ${err}` });
        });
    }

    // Încheiere instantă cu extragere pe loc
    if (interaction.commandName === 'end-giveaway') {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ Fără permisiuni!', ephemeral: true });
        }
        const messageId = interaction.options.getString('id_mesaj');
        await interaction.reply({ content: '⏳ Se oprește giveaway-ul și se extrag câștigătorii...', ephemeral: true });

        client.giveawaysManager.end(messageId).then(() => {
            interaction.editReply({ content: '✅ Giveaway-ul a fost oprit cu succes, câștigătorii au fost extrași!' });
        }).catch(() => {
            interaction.editReply({ content: '❌ Nu am putut opri acest giveaway. Verifică dacă ID-ul este corect sau dacă nu cumva e deja încheiat.' });
        });
    }

    // Anulare completă (ștergere fără extragere)
    if (interaction.commandName === 'cancel-giveaway') {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ Fără permisiuni!', ephemeral: true });
        }
        const messageId = interaction.options.getString('id_mesaj');
        await interaction.reply({ content: '⏳ Se anulează giveaway-ul...', ephemeral: true });

        client.giveawaysManager.delete(messageId).then(() => {
            interaction.editReply({ content: '🛑 Giveaway-ul a fost anulat și șters complet de pe server!' });
        }).catch(() => {
            interaction.editReply({ content: '❌ Nu am putut anula giveaway-ul.' });
        });
    }
});

const http = require('http');
http.createServer((req, res) => {
    res.write("Aku Bot Custom este activ 24/7!");
    res.end();
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
