import {
  BadgeDollarSign, Ban, BookOpen, Bot, Building2, CalendarCheck, CalendarDays, CheckCircle2, CircleDot, ClipboardList,
  CreditCard, Diamond, Download, FileSignature, FileText, Flag, Globe, Handshake, Hourglass, Inbox, LayoutTemplate,
  ListChecks, Mail, Megaphone, MessageCircle, MessagesSquare, MonitorPlay, MousePointerClick, Newspaper, Phone, PlayCircle,
  Presentation, Radio, Repeat, Rocket, Search, Share2, ShoppingCart, Sparkles, Target, ThumbsUp, Trophy, UserCheck,
  UserPlus, Users, Video, Wrench, XCircle, ArrowRightLeft, type LucideIcon,
} from "lucide-react";
import { siAirtable, siApple, siAppstore, siAsana, siBehance, siBrevo, siCalendly, siClaude, siClickup, siDiscord, siDribbble, siFacebook, siFigma, siGithub, siGmail, siGoogle, siGoogleads, siGoogleanalytics, siGooglecalendar, siGoogleforms, siGooglemaps, siGooglemeet, siGoogleplay, siGooglesheets, siGoogletagmanager, siHubspot, siInstagram, siIntercom, siJira, siLine, siLinktree, siLoom, siMailchimp, siMake, siMedium, siMercadopago, siMessenger, siMeta, siMiro, siN8n, siNotion, siOdoo, siPaypal, siPinterest, siReddit, siShopify, siSignal, siSnapchat, siSpotify, siStripe, siSubstack, siTelegram, siThreads, siTiktok, siTrello, siTwitch, siUber, siViber, siVimeo, siWaze, siWebflow, siWechat, siWhatsapp, siWix, siWordpress, siX, siYoutube, siZapier, siZoho, siZoom } from "simple-icons";
import type { NodeCategory } from "./types";
import { brandIcon, inkFor, letterIcon, type IconComponent } from "./brand-icons";

export type CatalogItem = {
  key: string;
  label: string;
  category: NodeCategory;
  icon: LucideIcon | IconComponent;
  /** Color de fondo del paso cuando es una marca (si no, se usa el de la categoría). */
  brandColor?: string;
  /** Color del logo cuando la marca lo usa oscuro sobre su color (Spotify, Linktree, Waze, Mercado Pago). */
  brandInk?: string;
  /** Palabras extra para el buscador de la biblioteca. */
  keywords?: string;
};

export const CATEGORY_META: Record<NodeCategory, { label: string; color: string; hint: string }> = {
  source: { label: "Fuentes", color: "#2563eb", hint: "De dónde llegan las personas" },
  brand: { label: "Redes y herramientas", color: "#475569", hint: "Logos de redes, anuncios, mensajería y herramientas" },
  page: { label: "Páginas", color: "#0f766e", hint: "Páginas y formularios que visitan" },
  action: { label: "Acciones", color: "#c2410c", hint: "Lo que hacen: enviar, agendar, comprar" },
  offline: { label: "Conversaciones y offline", color: "#7c3aed", hint: "Llamadas, reuniones, eventos" },
  process: { label: "Proceso", color: "#334155", hint: "Etapas, tareas y decisiones del equipo" },
  crm: { label: "CRM", color: "#be185d", hint: "Estados del cliente en el CRM" },
};

export const CATALOG: CatalogItem[] = [
  // Fuentes
  { key: "src-paid-search", label: "Anuncios en buscador", category: "source", icon: Search },
  { key: "src-paid-social", label: "Anuncios en redes", category: "source", icon: Megaphone },
  { key: "src-organic-search", label: "Búsqueda orgánica", category: "source", icon: Globe },
  { key: "src-social", label: "Redes sociales", category: "source", icon: Share2 },
  { key: "src-linkedin", label: "LinkedIn", category: "source", icon: letterIcon("in"), brandColor: "#0A66C2" },
  { key: "src-email", label: "Email", category: "source", icon: Mail },
  { key: "src-referral", label: "Referido", category: "source", icon: UserPlus },
  { key: "src-whatsapp", label: "WhatsApp", category: "source", icon: brandIcon(siWhatsapp), brandColor: `#${siWhatsapp.hex}` },
  { key: "src-event", label: "Evento", category: "source", icon: CalendarDays },
  { key: "src-partner", label: "Aliado", category: "source", icon: Handshake },
  { key: "src-content", label: "Contenido / blog", category: "source", icon: Newspaper },
  { key: "src-direct", label: "Tráfico directo", category: "source", icon: Globe },
  // Redes y herramientas (logos oficiales de Simple Icons, CC0; los monogramas son marcas sin logo disponible)
  { key: "brand-facebook", label: "Facebook", category: "brand", icon: brandIcon(siFacebook), brandColor: `#${siFacebook.hex}`, keywords: "redes sociales meta" },
  { key: "brand-instagram", label: "Instagram", category: "brand", icon: brandIcon(siInstagram), brandColor: `#${siInstagram.hex}`, keywords: "redes sociales meta" },
  { key: "brand-tiktok", label: "TikTok", category: "brand", icon: brandIcon(siTiktok), brandColor: `#${siTiktok.hex}`, keywords: "redes sociales video" },
  { key: "brand-youtube", label: "YouTube", category: "brand", icon: brandIcon(siYoutube), brandColor: `#${siYoutube.hex}`, keywords: "redes sociales video" },
  { key: "brand-linkedin", label: "LinkedIn", category: "brand", icon: letterIcon("in"), brandColor: "#0A66C2", keywords: "redes sociales b2b" },
  { key: "brand-x", label: "X (Twitter)", category: "brand", icon: brandIcon(siX), brandColor: `#${siX.hex}`, keywords: "redes sociales twitter" },
  { key: "brand-threads", label: "Threads", category: "brand", icon: brandIcon(siThreads), brandColor: `#${siThreads.hex}`, keywords: "redes sociales meta" },
  { key: "brand-pinterest", label: "Pinterest", category: "brand", icon: brandIcon(siPinterest), brandColor: `#${siPinterest.hex}`, keywords: "redes sociales" },
  { key: "brand-snapchat", label: "Snapchat", category: "brand", icon: brandIcon(siSnapchat), brandColor: `#${siSnapchat.hex}`, keywords: "redes sociales" },
  { key: "brand-reddit", label: "Reddit", category: "brand", icon: brandIcon(siReddit), brandColor: `#${siReddit.hex}`, keywords: "redes sociales comunidad" },
  { key: "brand-twitch", label: "Twitch", category: "brand", icon: brandIcon(siTwitch), brandColor: `#${siTwitch.hex}`, keywords: "video en vivo" },
  { key: "brand-discord", label: "Discord", category: "brand", icon: brandIcon(siDiscord), brandColor: `#${siDiscord.hex}`, keywords: "comunidad chat" },
  { key: "brand-spotify", label: "Spotify", category: "brand", icon: brandIcon(siSpotify), brandColor: `#${siSpotify.hex}`, brandInk: "#0f172a", keywords: "podcast audio" },
  { key: "brand-vimeo", label: "Vimeo", category: "brand", icon: brandIcon(siVimeo), brandColor: `#${siVimeo.hex}`, keywords: "video" },
  { key: "brand-medium", label: "Medium", category: "brand", icon: brandIcon(siMedium), brandColor: `#${siMedium.hex}`, keywords: "blog contenido" },
  { key: "brand-substack", label: "Substack", category: "brand", icon: brandIcon(siSubstack), brandColor: `#${siSubstack.hex}`, keywords: "newsletter contenido" },
  { key: "brand-behance", label: "Behance", category: "brand", icon: brandIcon(siBehance), brandColor: `#${siBehance.hex}`, keywords: "portafolio diseño" },
  { key: "brand-dribbble", label: "Dribbble", category: "brand", icon: brandIcon(siDribbble), brandColor: `#${siDribbble.hex}`, keywords: "portafolio diseño" },
  { key: "brand-github", label: "GitHub", category: "brand", icon: brandIcon(siGithub), brandColor: `#${siGithub.hex}`, keywords: "código desarrollo" },
  { key: "brand-meta-ads", label: "Meta Ads", category: "brand", icon: brandIcon(siMeta), brandColor: `#${siMeta.hex}`, keywords: "anuncios facebook instagram pauta" },
  { key: "brand-google-ads", label: "Google Ads", category: "brand", icon: brandIcon(siGoogleads), brandColor: `#${siGoogleads.hex}`, keywords: "anuncios buscador pauta" },
  { key: "brand-google", label: "Google (búsqueda)", category: "brand", icon: brandIcon(siGoogle), brandColor: `#${siGoogle.hex}`, keywords: "buscador orgánico seo" },
  { key: "brand-google-maps", label: "Google Maps", category: "brand", icon: brandIcon(siGooglemaps), brandColor: `#${siGooglemaps.hex}`, keywords: "perfil de negocio mapas" },
  { key: "brand-bing", label: "Bing", category: "brand", icon: letterIcon("B"), brandColor: "#008373", keywords: "buscador microsoft" },
  { key: "brand-whatsapp", label: "WhatsApp", category: "brand", icon: brandIcon(siWhatsapp), brandColor: `#${siWhatsapp.hex}`, keywords: "mensajería chat" },
  { key: "brand-telegram", label: "Telegram", category: "brand", icon: brandIcon(siTelegram), brandColor: `#${siTelegram.hex}`, keywords: "mensajería chat" },
  { key: "brand-messenger", label: "Messenger", category: "brand", icon: brandIcon(siMessenger), brandColor: `#${siMessenger.hex}`, keywords: "mensajería chat facebook" },
  { key: "brand-signal", label: "Signal", category: "brand", icon: brandIcon(siSignal), brandColor: `#${siSignal.hex}`, keywords: "mensajería chat" },
  { key: "brand-wechat", label: "WeChat", category: "brand", icon: brandIcon(siWechat), brandColor: `#${siWechat.hex}`, keywords: "mensajería chat" },
  { key: "brand-line", label: "LINE", category: "brand", icon: brandIcon(siLine), brandColor: `#${siLine.hex}`, keywords: "mensajería chat" },
  { key: "brand-viber", label: "Viber", category: "brand", icon: brandIcon(siViber), brandColor: `#${siViber.hex}`, keywords: "mensajería chat" },
  { key: "brand-gmail", label: "Gmail", category: "brand", icon: brandIcon(siGmail), brandColor: `#${siGmail.hex}`, keywords: "correo email" },
  { key: "brand-outlook", label: "Outlook", category: "brand", icon: letterIcon("O"), brandColor: "#0078D4", keywords: "correo email microsoft" },
  { key: "brand-slack", label: "Slack", category: "brand", icon: letterIcon("S"), brandColor: "#4A154B", keywords: "chat equipo" },
  { key: "brand-teams", label: "Microsoft Teams", category: "brand", icon: letterIcon("T"), brandColor: "#6264A7", keywords: "videollamada chat equipo" },
  { key: "brand-intercom", label: "Intercom", category: "brand", icon: brandIcon(siIntercom), brandColor: `#${siIntercom.hex}`, keywords: "chat soporte" },
  { key: "brand-manychat", label: "ManyChat", category: "brand", icon: letterIcon("M"), brandColor: "#0084FF", keywords: "chatbot automatización" },
  { key: "brand-google-meet", label: "Google Meet", category: "brand", icon: brandIcon(siGooglemeet), brandColor: `#${siGooglemeet.hex}`, keywords: "videollamada reunión" },
  { key: "brand-google-calendar", label: "Google Calendar", category: "brand", icon: brandIcon(siGooglecalendar), brandColor: `#${siGooglecalendar.hex}`, keywords: "agenda calendario" },
  { key: "brand-google-forms", label: "Google Forms", category: "brand", icon: brandIcon(siGoogleforms), brandColor: `#${siGoogleforms.hex}`, keywords: "formulario" },
  { key: "brand-google-sheets", label: "Google Sheets", category: "brand", icon: brandIcon(siGooglesheets), brandColor: `#${siGooglesheets.hex}`, keywords: "hoja de cálculo" },
  { key: "brand-google-analytics", label: "Google Analytics", category: "brand", icon: brandIcon(siGoogleanalytics), brandColor: `#${siGoogleanalytics.hex}`, keywords: "analítica medición" },
  { key: "brand-google-tag-manager", label: "Google Tag Manager", category: "brand", icon: brandIcon(siGoogletagmanager), brandColor: `#${siGoogletagmanager.hex}`, keywords: "tracking medición" },
  { key: "brand-google-play", label: "Google Play", category: "brand", icon: brandIcon(siGoogleplay), brandColor: `#${siGoogleplay.hex}`, keywords: "app android" },
  { key: "brand-app-store", label: "App Store", category: "brand", icon: brandIcon(siAppstore), brandColor: `#${siAppstore.hex}`, keywords: "app ios apple" },
  { key: "brand-apple", label: "Apple", category: "brand", icon: brandIcon(siApple), brandColor: `#${siApple.hex}`, keywords: "ios" },
  { key: "brand-hubspot", label: "HubSpot", category: "brand", icon: brandIcon(siHubspot), brandColor: `#${siHubspot.hex}`, keywords: "crm ventas marketing" },
  { key: "brand-salesforce", label: "Salesforce", category: "brand", icon: letterIcon("SF"), brandColor: "#00A1E0", keywords: "crm ventas" },
  { key: "brand-pipedrive", label: "Pipedrive", category: "brand", icon: letterIcon("P"), brandColor: "#017737", keywords: "crm ventas" },
  { key: "brand-zoho", label: "Zoho", category: "brand", icon: brandIcon(siZoho, 1.45), brandColor: `#${siZoho.hex}`, keywords: "crm" },
  { key: "brand-odoo", label: "Odoo", category: "brand", icon: brandIcon(siOdoo, 1.5), brandColor: `#${siOdoo.hex}`, keywords: "erp crm" },
  { key: "brand-gohighlevel", label: "GoHighLevel", category: "brand", icon: letterIcon("GHL"), brandColor: "#188BF6", keywords: "crm agencia" },
  { key: "brand-calendly", label: "Calendly", category: "brand", icon: brandIcon(siCalendly), brandColor: `#${siCalendly.hex}`, keywords: "agenda cita" },
  { key: "brand-calcom", label: "Cal.com", category: "brand", icon: letterIcon("Cal"), brandColor: "#292929", keywords: "agenda cita" },
  { key: "brand-zoom", label: "Zoom", category: "brand", icon: brandIcon(siZoom, 1.6), brandColor: `#${siZoom.hex}`, keywords: "videollamada reunión" },
  { key: "brand-loom", label: "Loom", category: "brand", icon: brandIcon(siLoom), brandColor: `#${siLoom.hex}`, keywords: "video grabación" },
  { key: "brand-notion", label: "Notion", category: "brand", icon: brandIcon(siNotion), brandColor: `#${siNotion.hex}`, keywords: "documentos" },
  { key: "brand-trello", label: "Trello", category: "brand", icon: brandIcon(siTrello), brandColor: `#${siTrello.hex}`, keywords: "tareas tablero" },
  { key: "brand-clickup", label: "ClickUp", category: "brand", icon: brandIcon(siClickup), brandColor: `#${siClickup.hex}`, keywords: "tareas proyecto" },
  { key: "brand-asana", label: "Asana", category: "brand", icon: brandIcon(siAsana), brandColor: `#${siAsana.hex}`, keywords: "tareas proyecto" },
  { key: "brand-jira", label: "Jira", category: "brand", icon: brandIcon(siJira), brandColor: `#${siJira.hex}`, keywords: "tareas desarrollo" },
  { key: "brand-monday", label: "monday.com", category: "brand", icon: letterIcon("m"), brandColor: "#FF3D57", keywords: "tareas proyecto" },
  { key: "brand-miro", label: "Miro", category: "brand", icon: brandIcon(siMiro), brandColor: `#${siMiro.hex}`, keywords: "pizarra" },
  { key: "brand-figma", label: "Figma", category: "brand", icon: brandIcon(siFigma), brandColor: `#${siFigma.hex}`, keywords: "diseño" },
  { key: "brand-canva", label: "Canva", category: "brand", icon: letterIcon("C"), brandColor: "#00C4CC", keywords: "diseño" },
  { key: "brand-airtable", label: "Airtable", category: "brand", icon: brandIcon(siAirtable), brandColor: `#${siAirtable.hex}`, keywords: "base de datos" },
  { key: "brand-typeform", label: "Typeform", category: "brand", icon: letterIcon("Tf"), brandColor: "#262627", keywords: "formulario" },
  { key: "brand-tally", label: "Tally", category: "brand", icon: letterIcon("T"), brandColor: "#0f172a", keywords: "formulario" },
  { key: "brand-mailchimp", label: "Mailchimp", category: "brand", icon: brandIcon(siMailchimp), brandColor: `#${siMailchimp.hex}`, keywords: "email marketing" },
  { key: "brand-brevo", label: "Brevo", category: "brand", icon: brandIcon(siBrevo), brandColor: `#${siBrevo.hex}`, keywords: "email marketing" },
  { key: "brand-activecampaign", label: "ActiveCampaign", category: "brand", icon: letterIcon("AC"), brandColor: "#356AE6", keywords: "email marketing automatización" },
  { key: "brand-klaviyo", label: "Klaviyo", category: "brand", icon: letterIcon("K"), brandColor: "#232426", keywords: "email marketing ecommerce" },
  { key: "brand-zapier", label: "Zapier", category: "brand", icon: brandIcon(siZapier, 1.5), brandColor: `#${siZapier.hex}`, keywords: "automatización" },
  { key: "brand-make", label: "Make", category: "brand", icon: brandIcon(siMake), brandColor: `#${siMake.hex}`, keywords: "automatización" },
  { key: "brand-n8n", label: "n8n", category: "brand", icon: brandIcon(siN8n), brandColor: `#${siN8n.hex}`, keywords: "automatización" },
  { key: "brand-chatgpt", label: "ChatGPT", category: "brand", icon: letterIcon("AI"), brandColor: "#10A37F", keywords: "ia openai" },
  { key: "brand-claude", label: "Claude", category: "brand", icon: brandIcon(siClaude), brandColor: `#${siClaude.hex}`, keywords: "ia anthropic" },
  { key: "brand-wordpress", label: "WordPress", category: "brand", icon: brandIcon(siWordpress), brandColor: `#${siWordpress.hex}`, keywords: "sitio web" },
  { key: "brand-webflow", label: "Webflow", category: "brand", icon: brandIcon(siWebflow), brandColor: `#${siWebflow.hex}`, keywords: "sitio web" },
  { key: "brand-wix", label: "Wix", category: "brand", icon: brandIcon(siWix, 1.35), brandColor: `#${siWix.hex}`, keywords: "sitio web" },
  { key: "brand-shopify", label: "Shopify", category: "brand", icon: brandIcon(siShopify), brandColor: `#${siShopify.hex}`, keywords: "ecommerce tienda" },
  { key: "brand-linktree", label: "Linktree", category: "brand", icon: brandIcon(siLinktree), brandColor: `#${siLinktree.hex}`, brandInk: "#0f172a", keywords: "bio links" },
  { key: "brand-stripe", label: "Stripe", category: "brand", icon: brandIcon(siStripe), brandColor: `#${siStripe.hex}`, keywords: "pagos" },
  { key: "brand-paypal", label: "PayPal", category: "brand", icon: brandIcon(siPaypal), brandColor: `#${siPaypal.hex}`, keywords: "pagos" },
  { key: "brand-mercadopago", label: "Mercado Pago", category: "brand", icon: brandIcon(siMercadopago), brandColor: `#${siMercadopago.hex}`, brandInk: "#0f172a", keywords: "pagos" },
  { key: "brand-wompi", label: "Wompi", category: "brand", icon: letterIcon("W"), brandColor: "#1F2937", keywords: "pagos colombia" },
  { key: "brand-nequi", label: "Nequi", category: "brand", icon: letterIcon("N"), brandColor: "#200020", keywords: "pagos colombia" },
  { key: "brand-bancolombia", label: "Bancolombia", category: "brand", icon: letterIcon("B"), brandColor: "#FDDA24", keywords: "pagos banco colombia" },
  { key: "brand-uber", label: "Uber", category: "brand", icon: brandIcon(siUber, 1.5), brandColor: `#${siUber.hex}`, keywords: "transporte" },
  { key: "brand-rappi", label: "Rappi", category: "brand", icon: letterIcon("R"), brandColor: "#FF441F", keywords: "entregas colombia" },
  { key: "brand-waze", label: "Waze", category: "brand", icon: brandIcon(siWaze), brandColor: `#${siWaze.hex}`, brandInk: "#0f172a", keywords: "mapas" },
  // Páginas
  { key: "page-landing", label: "Landing page", category: "page", icon: LayoutTemplate },
  { key: "page-optin", label: "Opt-in", category: "page", icon: Inbox },
  { key: "page-sales", label: "Página de ventas", category: "page", icon: BadgeDollarSign },
  { key: "page-vsl", label: "Página con video", category: "page", icon: MonitorPlay },
  { key: "page-form", label: "Formulario / aplicación", category: "page", icon: ClipboardList },
  { key: "page-calendar", label: "Agenda", category: "page", icon: CalendarDays },
  { key: "page-checkout", label: "Checkout", category: "page", icon: CreditCard },
  { key: "page-upsell", label: "Oferta adicional", category: "page", icon: Sparkles },
  { key: "page-thanks", label: "Página de gracias", category: "page", icon: ThumbsUp },
  { key: "page-webinar", label: "Webinar", category: "page", icon: Presentation },
  { key: "page-download", label: "Descarga", category: "page", icon: Download },
  { key: "page-blog", label: "Artículo", category: "page", icon: BookOpen },
  { key: "page-generic", label: "Página", category: "page", icon: FileText },
  // Acciones
  { key: "act-form", label: "Formulario enviado", category: "action", icon: ClipboardList },
  { key: "act-booking", label: "Cita agendada", category: "action", icon: CalendarCheck },
  { key: "act-purchase", label: "Compra", category: "action", icon: ShoppingCart },
  { key: "act-click", label: "Clic", category: "action", icon: MousePointerClick },
  { key: "act-video", label: "Video visto", category: "action", icon: PlayCircle },
  { key: "act-reply", label: "Respuesta", category: "action", icon: MessagesSquare },
  { key: "act-signup", label: "Registro", category: "action", icon: UserCheck },
  { key: "act-custom", label: "Acción personalizada", category: "action", icon: Target },
  // Conversaciones y offline
  { key: "off-call", label: "Llamada", category: "offline", icon: Phone },
  { key: "off-meeting", label: "Reunión", category: "offline", icon: Users },
  { key: "off-videocall", label: "Videollamada", category: "offline", icon: Video },
  { key: "off-chat", label: "Chat", category: "offline", icon: MessageCircle },
  { key: "off-event", label: "Evento presencial", category: "offline", icon: Building2 },
  { key: "off-mail", label: "Correo físico", category: "offline", icon: Mail },
  { key: "off-media", label: "Medios (radio, TV, impresos)", category: "offline", icon: Radio },
  // Proceso
  { key: "proc-stage", label: "Etapa", category: "process", icon: Flag },
  { key: "proc-task", label: "Tarea", category: "process", icon: ListChecks },
  { key: "proc-decision", label: "Decisión", category: "process", icon: Diamond },
  { key: "proc-handoff", label: "Traspaso", category: "process", icon: ArrowRightLeft },
  { key: "proc-wait", label: "Espera", category: "process", icon: Hourglass },
  { key: "proc-tool", label: "Herramienta", category: "process", icon: Wrench },
  { key: "proc-automation", label: "Automatización", category: "process", icon: Bot },
  { key: "proc-start", label: "Inicio", category: "process", icon: Rocket },
  { key: "proc-end", label: "Fin", category: "process", icon: CircleDot },
  // CRM
  { key: "crm-lead", label: "Lead nuevo", category: "crm", icon: UserPlus },
  { key: "crm-qualified", label: "Lead calificado", category: "crm", icon: CheckCircle2 },
  { key: "crm-proposal", label: "Propuesta enviada", category: "crm", icon: FileSignature },
  { key: "crm-won", label: "Ganado", category: "crm", icon: Trophy },
  { key: "crm-lost", label: "Perdido", category: "crm", icon: XCircle },
  { key: "crm-paid", label: "Pago recibido", category: "crm", icon: BadgeDollarSign },
  { key: "crm-renewal", label: "Renovación", category: "crm", icon: Repeat },
  { key: "crm-disqualified", label: "Descartado", category: "crm", icon: Ban },
];

const BY_KEY = new Map(CATALOG.map((i) => [i.key, i]));

/** Colores de fondo y de ícono de un paso: marca si la tiene, categoría si no. */
export function stepColors(item: CatalogItem): { bg: string; fg: string } {
  const bg = item.brandColor ?? CATEGORY_META[item.category]?.color ?? "#334155";
  return { bg, fg: item.brandInk ?? (item.brandColor ? inkFor(item.brandColor) : "#ffffff") };
}

export function getCatalogItem(key: string): CatalogItem {
  return BY_KEY.get(key) ?? { key, label: "Paso", category: "page", icon: FileText };
}
