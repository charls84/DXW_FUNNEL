import {
  BadgeDollarSign, Ban, BookOpen, Bot, Building2, CalendarCheck, CalendarDays, CheckCircle2, CircleDot, ClipboardList,
  CreditCard, Diamond, Download, FileSignature, FileText, Flag, Globe, Handshake, Hourglass, Inbox, LayoutTemplate,
  ListChecks, Mail, Megaphone, MessageCircle, MessagesSquare, MonitorPlay, MousePointerClick, Newspaper, Phone, PlayCircle,
  Presentation, Radio, Repeat, Rocket, Search, Share2, ShoppingCart, Sparkles, Target, ThumbsUp, Trophy, UserCheck,
  UserPlus, Users, Video, Wrench, XCircle, ArrowRightLeft, type LucideIcon,
} from "lucide-react";
import type { NodeCategory } from "./types";

export type CatalogItem = { key: string; label: string; category: NodeCategory; icon: LucideIcon };

export const CATEGORY_META: Record<NodeCategory, { label: string; color: string; hint: string }> = {
  source: { label: "Fuentes", color: "#2563eb", hint: "De dónde llegan las personas" },
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
  { key: "src-linkedin", label: "LinkedIn", category: "source", icon: Users },
  { key: "src-email", label: "Email", category: "source", icon: Mail },
  { key: "src-referral", label: "Referido", category: "source", icon: UserPlus },
  { key: "src-whatsapp", label: "WhatsApp", category: "source", icon: MessageCircle },
  { key: "src-event", label: "Evento", category: "source", icon: CalendarDays },
  { key: "src-partner", label: "Aliado", category: "source", icon: Handshake },
  { key: "src-content", label: "Contenido / blog", category: "source", icon: Newspaper },
  { key: "src-direct", label: "Tráfico directo", category: "source", icon: Globe },
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

export function getCatalogItem(key: string): CatalogItem {
  return BY_KEY.get(key) ?? { key, label: "Paso", category: "page", icon: FileText };
}
