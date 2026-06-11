import { useState, useEffect } from 'react';
import { Button, Icon, useToast } from '@economic/taco';
import {
    COLORS,
    EconomicLogo,
    NodeMark,
    ProfileAvatar,
    ChatIcon,
    ReviewIcon,
    InsightsIcon,
    SkillsIcon,
    SpacesIcon,
    SidebarTooltip,
    ScopeContext,
} from './ui';

const SIDEBAR_BG = 'rgb(41, 40, 62)';
const SIDEBAR_BORDER = 'rgba(255,255,255,0.10)';
import { INITIAL_SKILLS, INITIAL_SPACES, AGREEMENTS } from './data';
import type { Skill, Space, ViewId } from './types';
import ChatView from './views/ChatView';
import InsightsView, { INSIGHTS_PRICE, insightsAnswer, insightsIntro, insightsChips } from './views/InsightsView';
import ActivityView, { ACTIVITY_ENTRIES, reviewAnswer } from './views/ActivityView';
import SkillsView from './views/SkillsView';
import SpacesView from './views/SpacesView';
import { ChatPanel, type PendingAsk } from './ChatPanel';
import { Onboarding } from './Onboarding';
import { LangContext, translate, type Lang } from './i18n';

const RAIL: { id: ViewId; label: string; Icon: (p: { active: boolean }) => JSX.Element }[] = [
    { id: 'chat', label: 'Chat', Icon: ChatIcon },
    { id: 'activity', label: 'Review', Icon: ReviewIcon },
    { id: 'insights', label: 'Insights', Icon: InsightsIcon },
    { id: 'skills', label: 'Skills', Icon: SkillsIcon },
    { id: 'spaces', label: 'Artifacts', Icon: SpacesIcon },
];

const VIEW_IDS: ViewId[] = ['chat', 'insights', 'activity', 'skills', 'spaces'];

// Friendly URL slugs for each page (the Review page's internal id is 'activity';
// Artifacts kept the internal id 'spaces' — '#/spaces' is a legacy alias).
const VIEW_SLUG: Record<ViewId, string> = { chat: 'chat', activity: 'review', insights: 'insights', skills: 'skills', spaces: 'artifacts' };
const SLUG_VIEW: Record<string, ViewId> = { chat: 'chat', review: 'activity', insights: 'insights', skills: 'skills', artifacts: 'spaces', spaces: 'spaces' };

const ACCOUNT_ITEMS: { icon: string; label: string; badge?: boolean }[] = [
    { icon: 'search', label: 'Search' },
    { icon: 'circle-questionmark', label: 'Help & support' },
    { icon: 'settings', label: 'Settings' },
    { icon: 'bell-solid', label: 'Notifications', badge: true },
];

let spaceSeq = 100;
let skillSeq = 100;

export default function App() {
    const toast = useToast();
    const [view, setView] = useState<ViewId>(() => {
        const h = window.location.hash.replace(/^#\/?/, '');
        if (SLUG_VIEW[h]) return SLUG_VIEW[h];
        const saved = localStorage.getItem('va-view') as ViewId | null;
        return saved && VIEW_IDS.includes(saved) ? saved : 'chat';
    });
    useEffect(() => {
        localStorage.setItem('va-view', view);
    }, [view]);

    const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
    const [spaces, setSpaces] = useState<Space[]>(INITIAL_SPACES);
    const [activeSpace, setActiveSpace] = useState<Space | null>(null);
    const [activity, setActivity] = useState(ACTIVITY_ENTRIES);
    const [activityStatus, setActivityStatus] = useState<'all' | 'completed' | 'needs-review'>('needs-review');
    const [chatCollapsed, setChatCollapsed] = useState(() => localStorage.getItem('va-chat-collapsed') === '1');
    useEffect(() => {
        localStorage.setItem('va-chat-collapsed', chatCollapsed ? '1' : '0');
    }, [chatCollapsed]);
    const [pendingAsk, setPendingAsk] = useState<PendingAsk | null>(null);
    const [insightsPro, setInsightsPro] = useState(() => localStorage.getItem('va-insights-pro') === '1');
    useEffect(() => {
        localStorage.setItem('va-insights-pro', insightsPro ? '1' : '0');
    }, [insightsPro]);
    function upgradeInsights() {
        if (insightsPro) return;
        setInsightsPro(true);
        toast.success(`Financial Insights unlocked · ${INSIGHTS_PRICE} kr/month`);
    }
    const [accountOpen, setAccountOpen] = useState(false);
    const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('va-lang') === 'da' ? 'da' : 'en'));
    useEffect(() => {
        localStorage.setItem('va-lang', lang);
    }, [lang]);
    const t = (s: string) => translate(lang, s);
    // Hash routing — every page has its own URL (#/chat, #/review, …, plus #/onboarding).
    const [route, setRoute] = useState<string>(() => window.location.hash.replace(/^#\/?/, ''));
    useEffect(() => {
        const onHash = () => {
            const h = window.location.hash.replace(/^#\/?/, '');
            setRoute(h);
            if (SLUG_VIEW[h]) setView(SLUG_VIEW[h]);
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    // On first load, make sure the URL reflects the current page so it's directly linkable.
    useEffect(() => {
        const h = window.location.hash.replace(/^#\/?/, '');
        if (!SLUG_VIEW[h] && h !== 'onboarding') {
            history.replaceState(null, '', `#/${VIEW_SLUG[view]}`);
            setRoute(VIEW_SLUG[view]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    function navigate(slug: string) {
        window.location.hash = `#/${slug}`;
    }
    function goView(v: ViewId) {
        setView(v);
        navigate(VIEW_SLUG[v]);
    }
    const [welcome, setWelcome] = useState(false);
    const [chatKey, setChatKey] = useState(0);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('va-collapsed') === '1');
    useEffect(() => {
        localStorage.setItem('va-collapsed', collapsed ? '1' : '0');
    }, [collapsed]);

    const [scope, setScope] = useState<string>(() => localStorage.getItem('va-scope') || 'portfolio');
    const [pendingScope, setPendingScope] = useState<string | null>(null);
    const [chatActive, setChatActive] = useState(false);
    useEffect(() => {
        localStorage.setItem('va-scope', scope);
    }, [scope]);
    const nameOf = (s: string) => (s === 'portfolio' ? 'Portfolio' : AGREEMENTS.find((a) => a.id === s)?.name ?? 'Portfolio');
    const scopeName = scope === 'portfolio' ? 'All agreements' : nameOf(scope);
    const needsReview = activity.filter((e) => (scope === 'portfolio' || e.client === scope) && e.status === 'needs-review').length;

    function skillsAnswer(q: string): string {
        const t = q.toLowerCase();
        const active = skills.filter((s) => s.state === 'active').length;
        if (/which|enable|recommend|should|next/.test(t)) return `You have ${active} skills active. Based on your books I'd enable “Collect missing documents” and “Close the books” next — they'd save the most manual work.`;
        if (/reconcil|bank/.test(t)) return 'Bank reconciliation matches incoming and outgoing payments to invoices and bills, then books them to the right account — you only review anything low-confidence.';
        if (/remind/.test(t)) return 'The reminders skill watches overdue invoices and sends the right template per client and language, logs a note, and follows up automatically.';
        return 'Each skill automates one job — reconciliation, reminders, document collection, monitoring and more. Open a skill to set its trigger, autonomy and guardrails. What do you want to automate?';
    }
    function spacesAnswer(q: string): string {
        const t = q.toLowerCase().replace(/[?.!]/g, '').trim();
        if (activeSpace) return `On it — I'll ${t} for “${activeSpace.title}” and update it live.`;
        if (/dashboard|revenue/.test(t)) return 'I can build a revenue dashboard with a monthly trend, period comparison and a forecast. Want me to create it now?';
        if (/receivable|aged|report/.test(t)) return 'An aged receivables report buckets open invoices by 0–30 / 31–60 / 61–90 / 90+ days and flags the worst exposure. I can save it as an artifact.';
        return 'An artifact is a reusable dashboard, report, list or form built from your data. Tell me what you want to see and I’ll create it.';
    }

    // The contextual Eva chat panel (third shell block) — present on every content page.
    const subjectLabel = scope === 'portfolio' ? 'your portfolio' : scopeName;
    const chatPanel =
        view === 'activity'
            ? {
                  subtitle: 'review assistant',
                  intro: "I'm Eva. Ask me about your review queue — or hit “Ask Eva” on a flagged item and I'll explain my thinking.",
                  chips: ['What needs my attention most?', 'Summarize today’s actions', 'Anything risky?'],
                  respond: (q: string) => reviewAnswer(activity, q),
              }
            : view === 'insights'
            ? {
                  subtitle: 'insights analyst',
                  intro: insightsIntro(insightsPro, subjectLabel),
                  chips: insightsChips(insightsPro),
                  respond: (q: string) => insightsAnswer(scope, insightsPro, subjectLabel, q),
              }
            : view === 'skills'
            ? {
                  subtitle: 'skills assistant',
                  intro: "I'm Eva. I can help you pick the right skills, explain what each automates, or set one up. What are you trying to automate?",
                  chips: ['Which skills should I enable?', 'What does reconciliation automate?', 'Help me set up reminders'],
                  respond: skillsAnswer,
              }
            : view === 'spaces'
            ? {
                  subtitle: activeSpace ? 'about this artifact' : 'artifacts assistant',
                  intro: activeSpace
                      ? `Ask me to refine “${activeSpace.title}” — add a forecast, filter it, or export it.`
                      : "I'm Eva. Tell me what you want to track and I'll spin up an artifact — a dashboard, report, list or form.",
                  chips: activeSpace
                      ? ['Add a forecast', 'Filter to last quarter', 'Export as PDF']
                      : ['Build a revenue dashboard', 'Create an aged receivables report', 'What can an artifact do?'],
                  respond: spacesAnswer,
              }
            : null;
    // Remount the panel (fresh conversation) when the page, the open artifact, or the language changes.
    const panelKey = view + (view === 'spaces' ? (activeSpace?.id ?? 'list') : '') + lang;

    function applyScope(s: string) {
        setScope(s);
        setChatKey((k) => k + 1); // reset the chat — context changed
        setPendingScope(null);
    }
    function chooseScope(s: string) {
        if (s === scope) return;
        // Warn only if there's a live conversation to lose
        if (view === 'chat' && chatActive) {
            setPendingScope(s);
        } else {
            applyScope(s);
        }
    }

    function enableSkill(id: string) {
        setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, state: 'active', stat: 'Just enabled' } : s)));
        const sk = skills.find((s) => s.id === id);
        if (sk) toast.success(`Enabled “${sk.title}” for ${sk.price} DKK/month`);
    }

    // A custom skill created from a data view in the chat ("Automate this").
    function createSkillFromChat(title: string, description: string) {
        setSkills((prev) => [...prev, {
            id: `custom-${skillSeq++}`,
            emoji: '🪄',
            title,
            description,
            color: '#8b46d6',
            state: 'active',
            stat: t('Just created'),
        }]);
        toast.success(lang === 'da' ? `Skill “${title}” oprettet` : `Created skill “${title}”`);
    }

    function addSpace(title: string, description: string) {
        const t = title.toLowerCase();
        const emoji = /dashboard|revenue|chart|trend/.test(t)
            ? '📊'
            : /report|receivable|aged|summary/.test(t)
            ? '📈'
            : /form|expense/.test(t)
            ? '🧾'
            : /invoice|template/.test(t)
            ? '📄'
            : /customer|client/.test(t)
            ? '👥'
            : /budget|cost/.test(t)
            ? '💰'
            : '🗂️';
        const space: Space = { id: `sp-${spaceSeq++}`, title, description, updated: 'Jun 4, 2026', messages: 1, emoji };
        setSpaces((prev) => [space, ...prev]);
        toast.success(`Created artifact “${title}”`);
    }

    const panelShadow = '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)';

    return (
        <LangContext.Provider value={{ lang, setLang, t }}>
        <ScopeContext.Provider value={{ scope, onChoose: chooseScope }}>
        <div className="flex" style={{ height: '100vh', background: '#ececee', padding: 10, gap: 10 }}>
            {/* Left sidebar — floating */}
            <aside
                className="flex flex-col shrink-0 rounded-2xl"
                style={{
                    width: collapsed ? 68 : 240,
                    background: SIDEBAR_BG,
                    border: `1px solid ${SIDEBAR_BORDER}`,
                    boxShadow: panelShadow,
                    transition: 'width .18s ease',
                }}
            >
                {/* Brand + collapse toggle */}
                <div
                    className="flex items-center"
                    style={{ height: 60, justifyContent: collapsed ? 'center' : 'space-between', paddingLeft: collapsed ? 0 : 16, paddingRight: collapsed ? 0 : 8 }}
                >
                    {collapsed ? (
                        <button
                            onClick={() => setCollapsed(false)}
                            title="Expand sidebar"
                            className="rounded-md p-1.5"
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <NodeMark size={24} />
                        </button>
                    ) : (
                        <>
                            <EconomicLogo white />
                            <button
                                onClick={() => setCollapsed(true)}
                                title="Collapse sidebar"
                                className="rounded-md p-1.5"
                                style={{ color: 'rgba(255,255,255,0.6)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <Icon name="chevron-left-double" />
                            </button>
                        </>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex flex-col gap-1 mt-3" style={{ paddingLeft: collapsed ? 10 : 12, paddingRight: collapsed ? 10 : 12 }}>
                    {RAIL.map(({ id, label: railLabel, Icon: RIcon }) => {
                        const active = view === id;
                        const label = t(railLabel);
                        return (
                            <SidebarTooltip key={id} label={label} show={collapsed}>
                            <button
                                onClick={() => goView(id)}
                                className="flex items-center gap-3 rounded-lg text-sm text-left w-full"
                                style={{
                                    padding: collapsed ? '9px 0' : '8px 12px',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                                    color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
                                    fontWeight: active ? 600 : 500,
                                }}
                                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span className="relative flex items-center shrink-0">
                                    <RIcon active={active} />
                                    {collapsed && id === 'activity' && needsReview > 0 && (
                                        <span className="absolute rounded-full" style={{ top: -4, right: -5, width: 8, height: 8, background: '#ed9b2c', border: `2px solid ${SIDEBAR_BG}` }} />
                                    )}
                                </span>
                                {!collapsed && <span className="flex-1">{label}</span>}
                                {!collapsed && id === 'activity' && needsReview > 0 && (
                                    <span className="rounded-full text-xs font-semibold" style={{ background: '#ed9b2c', color: '#1f1d2e', padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>{needsReview}</span>
                                )}
                            </button>
                            </SidebarTooltip>
                        );
                    })}
                </nav>

                <div className="flex-1" />

                {/* Account (bottom) */}
                <div className="relative" style={{ padding: collapsed ? 8 : 12 }}>
                    {accountOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setAccountOpen(false)} />
                            <div
                                className="absolute z-40 rounded-xl bg-white overflow-hidden anim-in"
                                style={
                                    collapsed
                                        ? { left: 'calc(100% - 2px)', bottom: 8, width: 224, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.14)' }
                                        : { left: 12, right: 12, bottom: 58, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.14)' }
                                }
                            >
                                {ACCOUNT_ITEMS.map((it) => (
                                    <button
                                        key={it.label}
                                        onClick={() => { toast.information(t(it.label)); setAccountOpen(false); }}
                                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm"
                                        style={{ color: COLORS.text }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <Icon name={it.icon as never} style={{ color: COLORS.textMuted }} />
                                        <span className="flex-1">{t(it.label)}</span>
                                        {it.badge && <span className="rounded-full" style={{ width: 7, height: 7, background: '#ef4444' }} />}
                                    </button>
                                ))}
                                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                                {/* Language — for demoing in Danish */}
                                <div className="flex items-center gap-3 px-3 py-2.5">
                                    <Icon name="website" style={{ color: COLORS.textMuted }} />
                                    <span className="flex-1 text-sm" style={{ color: COLORS.text }}>{t('Language')}</span>
                                    <div className="flex items-center rounded-lg p-0.5" style={{ background: '#f1f1f3' }}>
                                        {(['en', 'da'] as Lang[]).map((l) => (
                                            <button
                                                key={l}
                                                onClick={() => setLang(l)}
                                                className="rounded-md text-xs font-semibold"
                                                style={{
                                                    padding: '3px 9px',
                                                    background: lang === l ? '#fff' : 'transparent',
                                                    color: lang === l ? COLORS.text : COLORS.textMuted,
                                                    boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                                }}
                                            >
                                                {l === 'en' ? 'EN' : 'DA'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                                <button
                                    onClick={() => { navigate('onboarding'); setAccountOpen(false); }}
                                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm"
                                    style={{ color: COLORS.text }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Icon name="play" style={{ color: COLORS.textMuted }} />
                                    <span className="flex-1">{t('Replay onboarding')}</span>
                                </button>
                                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                                <button
                                    onClick={() => { toast.information('Log out'); setAccountOpen(false); }}
                                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm"
                                    style={{ color: COLORS.text }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Icon name="log-out" style={{ color: COLORS.textMuted }} />
                                    <span className="flex-1">{t('Log out')}</span>
                                </button>
                            </div>
                        </>
                    )}

                    <SidebarTooltip label={t('Account settings')} show={collapsed}>
                    <button
                        onClick={() => setAccountOpen((o) => !o)}
                        className="flex items-center gap-2 w-full rounded-lg"
                        style={{
                            padding: collapsed ? 4 : '6px 8px',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            border: `1px solid ${accountOpen ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                            background: accountOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!accountOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={(e) => { if (!accountOpen) e.currentTarget.style.background = 'transparent'; }}
                    >
                        <span className="relative shrink-0">
                            <ProfileAvatar size={28} />
                            <span className="absolute rounded-full" style={{ top: -2, right: -2, width: 8, height: 8, background: '#ef4444', border: `2px solid ${SIDEBAR_BG}` }} />
                        </span>
                        {!collapsed && (
                            <>
                                <span className="flex-1 min-w-0 text-xs truncate text-left">
                                    <span className="font-medium" style={{ color: '#ffffff' }}>Tobias Holm Jensen</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}> · e-conomic Topco</span>
                                </span>
                                <Icon name={accountOpen ? 'chevron-up' : 'chevron-down'} className="shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} />
                            </>
                        )}
                    </button>
                    </SidebarTooltip>
                </div>
            </aside>

            {/* Main content — floating */}
            <main
                className="flex-grow overflow-hidden rounded-2xl"
                style={{ background: '#fff', border: `1px solid ${COLORS.cardBorder}`, boxShadow: panelShadow }}
            >
                {view === 'chat' && (
                    <ChatView
                        key={chatKey}
                        skills={skills}
                        spaces={spaces}
                        onEnableSkill={enableSkill}
                        onNavigate={goView}
                        onCreateSpace={(title) => addSpace(title, 'Generated from a chat conversation.')}
                        onCreateSkill={createSkillFromChat}
                        seedWelcome={welcome}
                        onWelcomeConsumed={() => setWelcome(false)}
                        scope={scope}
                        scopeName={scopeName}
                        onActiveChange={setChatActive}
                        analyticsUnlocked={insightsPro}
                        onSelectClient={applyScope}
                    />
                )}
                {view === 'insights' && <InsightsView scope={scope} scopeName={scopeName} pro={insightsPro} onUpgrade={upgradeInsights} />}
                {view === 'activity' && (
                    <ActivityView
                        entries={activity}
                        setEntries={setActivity}
                        status={activityStatus}
                        onStatusChange={setActivityStatus}
                        scope={scope}
                        onAskEva={(user, answer) => { setPendingAsk({ user, answer }); setChatCollapsed(false); }}
                    />
                )}
                {view === 'skills' && <SkillsView skills={skills} onEnable={enableSkill} />}
                {view === 'spaces' && <SpacesView spaces={spaces} onCreate={addSpace} onActiveSpaceChange={setActiveSpace} />}
            </main>

            {chatPanel && (
                <ChatPanel
                    key={panelKey}
                    subtitle={chatPanel.subtitle}
                    intro={chatPanel.intro}
                    chips={chatPanel.chips}
                    respond={chatPanel.respond}
                    collapsed={chatCollapsed}
                    onToggleCollapsed={() => setChatCollapsed((c) => !c)}
                    pendingAsk={pendingAsk}
                    onPendingConsumed={() => setPendingAsk(null)}
                />
            )}

            {pendingScope && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setPendingScope(null)}>
                    <div className="bg-white rounded-2xl w-full p-6 anim-in" style={{ maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-3 mb-2">
                            <span className="flex items-center justify-center shrink-0 rounded-xl" style={{ width: 38, height: 38, background: '#fdf8ec', color: '#92710f' }}>
                                <Icon name="circle-warning" />
                            </span>
                            <div>
                                <h2 className="text-base font-semibold" style={{ color: COLORS.text }}>Switch to {nameOf(pendingScope)}?</h2>
                                <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
                                    Your current chat will be cleared — it's specific to {scopeName}. Switching loads {nameOf(pendingScope) === 'Portfolio' ? 'your whole portfolio' : nameOf(pendingScope)} instead.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <Button onClick={() => setPendingScope(null)}>Cancel</Button>
                            <Button appearance="primary" onClick={() => applyScope(pendingScope)}>Switch & clear chat</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Onboarding lives at its own linkable URL (#/onboarding), shown as a full-screen overlay. */}
            {route === 'onboarding' && (
                <Onboarding
                    onClose={() => navigate(VIEW_SLUG[view])}
                    onComplete={() => { setWelcome(true); setChatKey((k) => k + 1); goView('chat'); }}
                />
            )}
        </div>
        </ScopeContext.Provider>
        </LangContext.Provider>
    );
}
