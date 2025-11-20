import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import ExcelJS from 'exceljs';

const BATCH_SIZE = 10;
// Hàm shuffle đơn giản, chúng ta sẽ dùng nó để tăng tính ngẫu nhiên
function shuffle<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const DownLoadReport = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Body: { ids: string[] } }>,
    reply: FastifyReply
) => {
    try {
        const { ids } = request.body;
        const { id: userId, role } = request.user as { id: string, role: string };
        const isAdmin = role === "admin" || role === "dev";
        const SPECIAL_USER_ID = "01994b3f-4097-77af-bb5b-a98db136c3e0";

        if (!Array.isArray(ids) || ids.length === 0) {
            return reply.status(400).send({ message: "Please provide valid IDs", success: false });
        }

        const SocialRunning = await fastify.prisma.site.findMany({
            where: {
                status: "running",
                type: { in: ["accountSocial", "social_accountSocial"] },
            },
            select: { domain: true },
        });
        const runningDomains = new Set(SocialRunning.map(site => site.domain));

        let allRows: any[] = []; // Sẽ chứa tất cả các hàng

        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            batches.push(ids.slice(i, i + BATCH_SIZE));
        }

        const queue: Promise<any>[] = [];

        for (const batch of batches) {
            const p = (async () => {
                const entities = await fastify.prisma.entityRequest.findMany({
                    where: isAdmin ? { id: { in: batch } } : { id: { in: batch }, userId },
                    select: { id: true, id_tool: true, userId: true },
                });

                const batchRows: any[] = [];

                for (const entity of entities) {
                    const links = await fastify.prisma.entityLink.findMany({
                        where: {
                            entityRequestId: entity.id,
                            link_profile: { not: "" },
                        },
                        select: {
                            site: true, email: true, username: true, password: true,
                            link_profile: true, link_post: true, note: true,
                        },
                    });

                    const filtered1 = links.filter(l => l.link_profile !== '');
                    const filtered2 = links.filter(
                        l => l.link_profile !== '' && l.note === 'stacking' && l.link_post !== l.link_profile
                    );

                    let finalLinks = [...filtered1, ...filtered2];

                    for (const task of finalLinks) {
                        const supportSocial = runningDomains.has(task.site) ? "Yes" : "";
                        batchRows.push({
                            entity_id: entity.id,
                            userId: entity.userId, // Thêm userId vào để xử lý sau
                            ...task,
                            two_fa: entity.id_tool === "Social" ? "" : undefined,
                            support_social: entity.id_tool !== "Social" ? supportSocial : undefined,
                        });
                    }
                }
                return batchRows;
            })();
            queue.push(p);
        }
        
        // Đợi tất cả batch xong và gom tất cả các hàng lại
        const results = await Promise.allSettled(queue);
        results.forEach(res => {
            if (res.status === "fulfilled") {
                allRows.push(...res.value);
            }
        });

        // --- PHẦN LOGIC SẮP XẾP MỚI ---

        // 1. Nhóm tất cả các hàng theo site
        const groupedBySite = allRows.reduce((acc, row) => {
            if (!acc[row.site]) {
                acc[row.site] = [];
            }
            acc[row.site].push(row);
            return acc;
        }, {} as Record<string, any[]>);

        // 2. Với các nhóm có chứa dữ liệu của user đặc biệt, hãy xáo trộn chúng
        for (const site in groupedBySite) {
            const group = groupedBySite[site];
            const hasSpecialUser = group.some((row:any) => row.userId === SPECIAL_USER_ID);
            if (hasSpecialUser) {
                groupedBySite[site] = shuffle(group);
            }
        }
        
        // 3. Thêm một "chỉ số xen kẽ" (interleaveIndex) vào mỗi hàng
        Object.values(groupedBySite).forEach((group:any) => {
            group.forEach((row:any, index:number) => {
                row.interleaveIndex = index;
            });
        });
        
        // 4. Sắp xếp cuối cùng
        const domainOrderMap = new Map(customOrder.map((domain, index) => [domain, index]));
        
        allRows.sort((a, b) => {
            // Ưu tiên 1: Sắp xếp theo chỉ số xen kẽ
            if (a.interleaveIndex !== b.interleaveIndex) {
                return a.interleaveIndex - b.interleaveIndex;
            }

            // Ưu tiên 2: Nếu chỉ số xen kẽ bằng nhau, sắp xếp theo customOrder
            const orderA = domainOrderMap.get(a.site) ?? Infinity;
            const orderB = domainOrderMap.get(b.site) ?? Infinity;
            if (orderA !== orderB) {
                return orderA - orderB;
            }

            // Ưu tiên 3: Sắp xếp theo alphabet nếu không có trong customOrder
            return a.site.localeCompare(b.site);
        });

        // --- KẾT THÚC LOGIC SẮP XẾP MỚI ---

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Tasks Report");

        worksheet.columns = [
            { header: "Domain", key: "site", width: 20 },
            { header: "Email", key: "email", width: 30 },
            { header: "Username", key: "username", width: 20 },
            { header: "Password", key: "password", width: 20 },
            { header: "2FA", key: "two_fa", width: 25 },
            { header: "Link Profile", key: "link_profile", width: 60 },
            { header: "Link Post", key: "link_post", width: 60 },
            { header: "Support Social", key: "support_social", width: 30 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        allRows.forEach(row => worksheet.addRow(row));

        reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        reply.header("Content-Disposition", `attachment; filename=entity_reports_${Date.now()}.xlsx`);
        const buffer = await workbook.xlsx.writeBuffer();
        return reply.send(buffer);

    } catch (error) {
        console.error("Error generating report:", error);
        return handleErrorResponse(reply, error);
    }
};


const customOrder = [
    "chambers.com.au",
    "max2play.com",
    "app.waterrangers.ca",
    "livepositively.com",
    "yamap.com",
    "community.enrgtech.co.uk",
    "veterinarypracticetransition.com",
    "earthmom.org",
    "social1776.com",
    "guiafacillagos.com.br",
    "mobygames.com",
    "slideserve.com",
    "historydb.date",
    "checkli.com",
    "forum.dfwmas.org",
    "files.fm",
    "reactos.org",
    "able2know.org",
    "telegra.ph",
    "demo.userproplugin.com",
    "bloggportalen.se",
    "careers.gita.org",
    "40billion.com",
    "coolors.co",
    "iniuria.us",
    "challonge.com",
    "fruitpickingjobs.com.au",
    "jobs.landscapeindustrycareers.org",
    "community.amd.com",
    "community.jamf.com",
    "heavyironjobs.com",
    "ask.embedded-wizard.de",
    "menwiki.men",
    "ingmac.ru",
    "photoclub.canadiangeographic.ca",
    "sparktv.net",
    "md.ctdo.de",
    "schoolido.lu",
    "kbharkiv.dk",
    "decidim.rezero.cat",
    "web.ggather.com",
    "jobs.westerncity.com",
    "gateoverflow.in",
    "espritgames.com",
    "dtan.thaiembassy.de",
    "backloggery.com",
    "designaddict.com",
    "pumpyoursound.com",
    "gp1.hr",
    "talkmarkets.com",
    "beatsaver.com",
    "theexplorers.com",
    "jobs.njota.org",
    "forum.lexulous.com",
    "roomstyler.com",
    "nintendo-master.com",
    "ekademia.pl",
    "fuelly.com",
    "simania.co.il",
    "kyourc.com",
    "silverstripe.org",
    "clearvoice.com",
    "theexeterdaily.co.uk",
    "remoteworker.co.uk",
    "ilm.iou.edu.gm",
    "joindota.com",
    "montessorijobsuk.co.uk",
    "deansandhomer.fogbugz.com",
    "aniworld.to",
    "community.networkofcare.org",
    "bluegrasstoday.com",
    "secondstreet.ru",
    "stuv.othr.de",
    "slatestarcodex.com",
    "participez.perigueux.fr",
    "safechat.com",
    "hackerspace.govhack.org",
    "partecipa.poliste.com",
    "marketplace.trinidadweddings.com",
    "dentaltechnician.org.uk",
    "akaqa.com",
    "saphalaafrica.co.za",
    "shootinfo.com",
    "wongcw.com",
    "participa.sostrecivic.coop",
    "pixbender.com",
    "rwaq.org",
    "designnominees.com",
    "advego.com",
    "pbase.com",
    "exchange.prx.org",
    "roton.com",
    "muckrack.com",
    "allmyfaves.com",
    "cars.yclas.com",
    "mavenanalytics.io",
    "varecha.pravda.sk",
    "aseeralkotb.com",
    "thesims3.com",
    "app.brancher.ai",
    "leetcode.com",
    "blender.community",
    "wowgilden.net",
    "catapulta.me",
    "forum.repetier.com",
    "malt-orden.info",
    "secure.fangamer.com",
    "awan.pro",
    "cscourse.ustc.edu.cn",
    "zenwriting.net",
    "motion-gallery.net",
    "youslade.com",
    "topbilliondirectory.com",
    "destek.matriksdata.com",
    "whyp.it",
    "fantasyplanet.cz",
    "myanimeshelf.com",
    "academy.worldrowing.com",
    "templepurohit.com",
    "vocal.media",
    "illust.daysneo.com",
    "forums.huntedcow.com",
    "forum.m5stack.com",
    "surfyourtown.com",
    "spiderum.com",
    "hugi.is",
    "pueblosecreto.com",
    "tatoeba.org",
    "os.mbed.com",
    "forums.starcontrol.com",
    "hubpages.com",
    "promosimple.com",
    "muaygarment.com",
    "invelos.com",
    "reactormag.com",
    "myget.org",
    "my.djtechtools.com",
    "algebra.com",
    "chordie.com",
    "forum.dmec.vn",
    "speedrun.com",
    "smartprogress.do",
    "crowdsourcer.io",
    "dreevoo.com",
    "vozer.net",
    "git.guildofwriters.org",
    "doselect.com",
    "naijamp3s.com",
    "hanson.net",
    "talk.tacklewarehouse.com",
    "stylevore.com",
    "startus.cc",
    "easyhits4u.com",
    "deafvideo.tv",
    "alumni.vfu.bg",
    "moshpyt.com",
    "angthong.mol.go.th",
    "jobs.asoprs.org",
    "songback.com",
    "my.clickthecity.com",
    "marshallyin.com",
    "myebook.com",
    "disqus.com",
    "dibiz.com",
    "hackmd.openmole.org",
    "sunemall.com",
    "magcloud.com",
    "dawlish.com",
    "ellak.gr",
    "dojomojo.com",
    "forum.musicalpraxis.gr",
    "theafricavoice.com",
    "innetads.com",
    "plurk.com",
    "qa.laodongzu.com",
    "fitinline.com",
    "videogamemods.com",
    "dermandar.com",
    "homepage.ninja",
    "git.project-hobbit.eu",
    "commu.nosv.org",
    "community.stencyl.com",
    "thetriumphforum.com",
    "castingcall.club",
    "pdf24x7.com",
    "amdm.ru",
    "mymeetbook.com",
    "decidim.pontault-combault.fr",
    "mtg-forum.de",
    "circleme.com",
    "pageorama.com",
    "gitlab.vuhdo.io",
    "contrebombarde.com",
    "forum.ixbt.com",
    "hoo.be",
    "hedgedoc.eclair.ec-lyon.fr",
    "maxforlive.com",
    "fabble.cc",
    "pxhere.com",
    "luvly.co",
    "link-tube.com",
    "d-ushop.com",
    "apptuts.bio",
    "codex.core77.com",
    "weddingbee.com",
    "rotorbuilds.com",
    "undrtone.com",
    "nicovideo.jp",
    "xoops.ec-cube.net",
    "eyecandid.io",
    "hostboard.com",
    "classificados.acheiusa.com",
    "findnerd.com",
    "forum.rodina-rp.com",
    "oye.participer.lyon.fr",
    "freestyler.ws",
    "forum.pokexgames.pl",
    "bikemap.net",
    "metal-tracker.com",
    "diggerslist.com",
    "question-ksa.com",
    "bookingblog.com",
    "biblesupport.com",
    "motiondesignawards.com",
    "link.space",
    "rohitab.com",
    "free-socialbookmarking.com",
    "photohito.com",
    "poipiku.com",
    "notebook.ai",
    "huzzaz.com",
    "engage.aiaa.org",
    "bandori.party",
    "jobs.lajobsportal.org",
    "upcarta.com",
    "storeboard.com",
    "medibang.com",
    "metroflog.co",
    "divephotoguide.com",
    "qooh.me",
    "fr.micromentor.org",
    "circaoldhouses.com",
    "klotzlube.ru",
    "fanart-central.net",
    "fitlynk.com",
    "petitlyrics.com",
    "maiotaku.com",
    "forum.dboglobal.to",
    "rehashclothes.com",
    "edufex.com",
    "phatwalletforums.com",
    "udrpsearch.com",
    "dday.it",
    "skool.com",
    "doodleordie.com",
    "topsitenet.com",
    "thaileoplastic.com",
    "dentolighting.com",
    "navacool.com",
    "rolepages.com",
    "japaaan.com",
    "skitterphoto.com",
    "gta5-mods.com",
    "iszene.com",
    "discuss.machform.com",
    "cinderella.pro",
    "oneeyeland.com",
    "bandzone.cz",
    "plazapublica.cdmx.gob.mx",
    "thepetservicesweb.com",
    "looperman.com",
    "bookemon.com",
    "mysportsgo.com",
    "war-lords.net",
    "bentleysystems.service-now.com",
    "community.jmp.com",
    "3dlancer.net",
    "zerosuicidetraining.edc.org",
    "ujkh.ru",
    "wordsdomatter.com",
    "8a.nu",
    "galleria.emotionflow.com",
    "shadertoy.com",
    "participer.loire-atlantique.fr",
    "pixabay.com",
    "40th.jiuzhai.com",
    "rossoneriblog.com",
    "we-xpats.com",
    "forum.bokser.org",
    "france-ioi.org",
    "klynt.net",
    "blueprintue.com",
    "faneo.es",
    "forum.issabel.org",
    "morguefile.com",
    "pastelink.net",
    "pt.enrollbusiness.com",
    "cadillacsociety.com",
    "jobs.windomnews.com",
    "source.coderefinery.org",
    "mlx.su",
    "myfishingreport.com",
    "careers.coloradopublichealth.org",
    "activepages.com.au",
    "ominous.app",
    "minecraft-servers-list.org",
    "devpost.com",
    "eternagame.org",
    "gendou.com",
    "forum.aigato.vn",
    "sarah30.com",
    "mentorship.healthyseminars.com",
    "plotterusati.it",
    "fanfiction.net",
    "tumblr.com",
    "resurrection.bungie.org",
    "courses.9marks.org",
    "giveawayoftheday.com",
    "library.zortrax.com",
    "idol.st",
    "outlived.co.uk",
    "sfx.thelazy.net",
    "colish.net",
    "keepandshare.com",
    "jakle.sakura.ne.jp",
    "bbs.heyshell.com",
    "pad.fs.lmu.de",
    "dokkan-battle.fr",
    "flyingsolo.com.au",
    "qna.habr.com",
    "ofuse.me",
    "easypano.com",
    "pubhtml5.com",
    "sociomix.com",
    "politforums.net",
    "postheaven.net",
    "gaiaonline.com",
    "rant.li",
    "linkmix.co",
    "jerseyboysblog.com",
    "pinup.com",
    "transfur.com",
    "intensedebate.com",
    "atozed.com",
    "humanart.cz",
    "humanlove.stream",
    "justpaste.me",
    "youbiz.com",
    "magic.ly",
    "pc.poradna.net",
    "timeoftheworld.date",
    "controlc.com",
    "freeimage.host",
    "interreg-euro-med.eu",
    "babelcube.com",
    "ardec.ca",
    "prosebox.net",
    "allods.my.games",
    "cornucopia.se",
    "besport.com",
    "akniga.org",
    "openlb.net",
    "nexusstem.co.uk",
    "tai-ji.net",
    "fora.babinet.cz",
    "hedge.fachschaft.informatik.uni-kl.de",
    "community.m5stack.com",
    "routinehub.co",
    "sketchfab.com",
    "learn.cipmikejachapter.org",
    "li.sten.to",
    "hentai-foundry.com",
    "ameba.jp",
    "phijkchu.com",
    "propeller.hu",
    "pantip.com",
    "raovat.nhadat.vn",
    "inkbunny.net",
    "linkstack.lgbt",
    "forum.roborock.com",
    "cannabis.net",
    "fotofed.nl",
    "storenvy.com",
    "monopinion.namur.be",
    "tizmos.com",
    "stes.tyc.edu.tw",
    "3dtoday.ru",
    "gegenstimme.tv",
    "community.orbitonline.com",
    "programujte.com",
    "universe.com",
    "swaay.com",
    "hcgdietinfo.com",
    "sciencemission.com",
    "forum.aceinna.com",
    "kumu.io",
    "haikudeck.com",
    "ask.mallaky.com",
    "odesli.co",
    "stratos-ad.com",
    "metaldevastationradio.com",
    "cadviet.com",
    "ztndz.com",
    "writexo.com",
    "sunlitcentrekenya.co.ke",
    "b.cari.com.my",
    "chart-studio.plotly.com",
    "md.fachschaften.org",
    "pad.coopaname.coop",
    "allmynursejobs.com",
    "md.sebastians.dev",
    "biolinku.co",
    "webanketa.com",
    "myspace.com",
    "doc.adminforge.de",
    "commentreparer.com",
    "snipesocial.co.uk",
    "kansabook.com",
    "orcid.org",
    "travelwithme.social",
    "haxorware.com",
    "cuchichi.es",
    "edabit.com",
    "etextpad.com",
    "electroswingthing.com",
    "ketcau.com",
    "sportjim.com",
    "jobs.suncommunitynews.com",
    "bricklink.com",
    "biomolecula.ru",
    "betmma.tips",
    "nursingportal.ca",
    "findit.com",
    "skypixel.com",
    "belgaumonline.com",
    "tooter.in",
    "fanclove.jp",
    "metooo.io",
    "iconfinder.com",
    "mecabricks.com",
    "king-wifi.win",
    "wakelet.com",
    "decide.enguera.es",
    "jobhop.co.uk",
    "80.82.64.206",
    "forum.tkool.jp",
    "code.antopie.org",
    "aunetads.com",
    "notepin.co",
    "enrollbusiness.com",
    "vnbadminton.com",
    "ebooklingo.com",
    "jobboard.piasd.org",
    "doc.aquilenet.fr",
    "warriorforum.com",
    "nhattao.com",
    "makeagif.com",
    "md.kif.rocks",
    "paper.wf",
    "pad.stuve.uni-ulm.de",
    "wvhired.com",
    "tableau.com",
    "sub4sub.net",
    "savelist.co",
    "participacion.cabildofuer.es",
    "pad.funkwhale.audio",
    "md.farafin.de",
    "delphi.larsbo.org",
    "claimajob.com",
    "genina.com",
    "md.darmstadt.ccc.de",
    "divinguniverse.com",
    "multichain.com",
    "runtrip.jp",
    "tahaduth.com",
    "adhocracy.plus",
    "wibki.com",
    "virt.club",
    "lovelinetapes.com",
    "alphacs.ro",
    "serviceprofessionalsnetwork.com",
    "robot-forum.com",
    "mygamedb.com",
    "slides.com",
    "bandlab.com",
    "app.geniusu.com",
    "itchyforum.com",
    "cfgfactory.com",
    "rcuniverse.com",
    "goodreads.com",
    "market360.vn",
    "hackerone.com",
    "lingvolive.com",
    "anibookmark.com",
    "palscity.com",
    "gojourney.xsrv.jp",
    "mixcloud.com",
    "spacedock.info"
];