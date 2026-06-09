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
} from './ui';

const SIDEBAR_BG = 'rgb(41, 40, 62)';
const SIDEBAR_BORDER = 'rgba(255,255,255,0.10)';
import { INITIAL_SKILLS, INITIAL_SPACES, AGREEMENTS } from './data';
import type { Skill, Space, ViewId } from './types';
import ChatView from './views/ChatView';
import ReviewView, { REVIEW_ITEMS } from './views/ReviewView';
import InsightsView, { INSIGHTS_PRICE } from './views/InsightsView';
import SkillsView from './views/SkillsView';
import SpacesView from './views/SpacesView';
import { Onboarding } from './Onboarding';

const RAIL: { id: ViewId; label: string; Icon: (p: { active: boolean }) => JSX.Element }[] = [
    { id: 'chat', label: 'Chat', Icon: ChatIcon },
    { id: 'review', label: 'Review', Icon: ReviewIcon },
    { id: 'insights', label: 'Insights', Icon: InsightsIcon },
    { id: 'skills', label: 'Skills', Icon: SkillsIcon },
    { id: 'spaces', label: 'Spaces', Icon: SpacesIcon },
];

const VIEW_IDS: ViewId[] = ['chat', 'review', 'insights', 'skills', 'spaces'];

const ACCOUNT_ITEMS: { icon: string; label: string; badge?: boolean }[] = [
    { icon: 'search', label: 'Search' },
    { icon: 'circle-questionmark', label: 'Help & support' },
    { icon: 'settings', label: 'Settings' },
    { icon: 'bell-solid', label: 'Notifications', badge: true },
];

let spaceSeq = 100;

export default function App() {
    const toast = useToast();
    const [view, setView] = useState<ViewId>(() => {
        const saved = localStorage.getItem('va-view') as ViewId | null;
        return saved && VIEW_IDS.includes(saved) ? saved : 'chat';
    });
    useEffect(() => {
        localStorage.setItem('va-view', view);
    }, [view]);

    const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
    const [spaces, setSpaces] = useState<Space[]>(INITIAL_SPACES);
    const [reviewItems, setReviewItems] = useState(REVIEW_ITEMS);
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
    // Lightweight hash routing so the onboarding flow has its own linkable URL (#/onboarding).
    const [route, setRoute] = useState<string>(() => window.location.hash.replace(/^#\/?/, ''));
    useEffect(() => {
        const onHash = () => setRoute(window.location.hash.replace(/^#\/?/, ''));
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    function navigate(r: string) {
        setRoute(r);
        if (r) window.location.hash = `#/${r}`;
        else history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const [welcome, setWelcome] = useState(false);
    const [chatKey, setChatKey] = useState(0);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('va-collapsed') === '1');
    useEffect(() => {
        localStorage.setItem('va-collapsed', collapsed ? '1' : '0');
    }, [collapsed]);

    const [scope, setScope] = useState<string>(() => localStorage.getItem('va-scope') || 'portfolio');
    const [scopeOpen, setScopeOpen] = useState(false);
    const [pendingScope, setPendingScope] = useState<string | null>(null);
    const [chatActive, setChatActive] = useState(false);
    useEffect(() => {
        localStorage.setItem('va-scope', scope);
    }, [scope]);
    const nameOf = (s: string) => (s === 'portfolio' ? 'Portfolio' : AGREEMENTS.find((a) => a.id === s)?.name ?? 'Portfolio');
    const scopeName = scope === 'portfolio' ? 'All agreements' : nameOf(scope);
    const needsReview = reviewItems.filter((i) => (scope === 'portfolio' || i.agreement === scope) && i.status === 'unresolved').length;

    function applyScope(s: string) {
        setScope(s);
        setChatKey((k) => k + 1); // reset the chat — context changed
        setScopeOpen(false);
        setPendingScope(null);
    }
    function chooseScope(s: string) {
        if (s === scope) {
            setScopeOpen(false);
            return;
        }
        // Warn only if there's a live conversation to lose
        if (view === 'chat' && chatActive) {
            setPendingScope(s);
            setScopeOpen(false);
        } else {
            applyScope(s);
        }
    }

    function enableSkill(id: string) {
        setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, state: 'active', stat: 'Just enabled' } : s)));
        const sk = skills.find((s) => s.id === id);
        if (sk) toast.success(`Enabled “${sk.title}” for ${sk.price} DKK/month`);
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
        toast.success(`Created Space “${title}”`);
    }

    const panelShadow = '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)';

    return (
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

                {/* Agreement scope switcher */}
                <div className="relative" style={{ padding: collapsed ? '4px 10px 8px' : '4px 12px 10px' }}>
                    {scopeOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setScopeOpen(false)} />
                            <div
                                className="absolute z-40 rounded-xl bg-white overflow-hidden anim-in"
                                style={
                                    collapsed
                                        ? { left: 'calc(100% - 2px)', top: 4, width: 248, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }
                                        : { left: 12, right: 12, top: 'calc(100% - 4px)', border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }
                                }
                            >
                                <p className="text-xs font-medium px-3 pt-2.5 pb-1" style={{ color: COLORS.textMuted }}>Work across</p>
                                <button
                                    onClick={() => chooseScope('portfolio')}
                                    className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 text-sm"
                                    style={{ color: COLORS.text }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Icon name="contacts" style={{ color: COLORS.textMuted }} />
                                    <span className="flex-1">Portfolio<span style={{ color: COLORS.textMuted }}> · {AGREEMENTS.length} agreements</span></span>
                                    {scope === 'portfolio' && <Icon name="tick" style={{ color: '#16a34a' }} />}
                                </button>
                                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                                <p className="text-xs font-medium px-3 pt-2.5 pb-1" style={{ color: COLORS.textMuted }}>A specific agreement</p>
                                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                                    {AGREEMENTS.map((a) => (
                                        <button
                                            key={a.id}
                                            onClick={() => chooseScope(a.id)}
                                            className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 text-sm"
                                            style={{ color: COLORS.text }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <Icon name="person" style={{ color: COLORS.textMuted }} />
                                            <span className="flex-1 truncate">{a.name}</span>
                                            {scope === a.id && <Icon name="tick" style={{ color: '#16a34a' }} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <SidebarTooltip label="Switch client" show={collapsed}>
                    <button
                        onClick={() => setScopeOpen((o) => !o)}
                        className="flex items-center gap-2 w-full rounded-lg"
                        style={{
                            padding: collapsed ? 8 : '8px 10px',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            background: 'rgba(255,255,255,0.06)',
                            border: `1px solid rgba(255,255,255,0.10)`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    >
                        <Icon name={scope === 'portfolio' ? 'contacts' : 'person'} style={{ color: 'rgba(255,255,255,0.85)' }} />
                        {!collapsed && (
                            <>
                                <span className="flex-1 min-w-0 text-left">
                                    <span className="block text-[10px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>Working across</span>
                                    <span className="block text-sm font-medium truncate" style={{ color: '#fff' }}>{scopeName}</span>
                                </span>
                                <Icon name="chevron-down" style={{ color: 'rgba(255,255,255,0.6)' }} />
                            </>
                        )}
                    </button>
                    </SidebarTooltip>
                </div>

                {/* Nav */}
                <nav className="flex flex-col gap-1 mt-1" style={{ paddingLeft: collapsed ? 10 : 12, paddingRight: collapsed ? 10 : 12 }}>
                    {RAIL.map(({ id, label, Icon: RIcon }) => {
                        const active = view === id;
                        return (
                            <SidebarTooltip key={id} label={label} show={collapsed}>
                            <button
                                onClick={() => setView(id)}
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
                                    {collapsed && id === 'review' && needsReview > 0 && (
                                        <span className="absolute rounded-full" style={{ top: -4, right: -5, width: 8, height: 8, background: '#ed9b2c', border: `2px solid ${SIDEBAR_BG}` }} />
                                    )}
                                </span>
                                {!collapsed && <span className="flex-1">{label}</span>}
                                {!collapsed && id === 'review' && needsReview > 0 && (
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
                                        onClick={() => { toast.information(it.label); setAccountOpen(false); }}
                                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm"
                                        style={{ color: COLORS.text }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <Icon name={it.icon as never} style={{ color: COLORS.textMuted }} />
                                        <span className="flex-1">{it.label}</span>
                                        {it.badge && <span className="rounded-full" style={{ width: 7, height: 7, background: '#ef4444' }} />}
                                    </button>
                                ))}
                                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                                <button
                                    onClick={() => { navigate('onboarding'); setAccountOpen(false); }}
                                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm"
                                    style={{ color: COLORS.text }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Icon name="play" style={{ color: COLORS.textMuted }} />
                                    <span className="flex-1">Replay onboarding</span>
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
                                    <span className="flex-1">Log out</span>
                                </button>
                            </div>
                        </>
                    )}

                    <SidebarTooltip label="Account settings" show={collapsed}>
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
                        onNavigate={setView}
                        onCreateSpace={(title) => addSpace(title, 'Generated from a chat conversation.')}
                        seedWelcome={welcome}
                        onWelcomeConsumed={() => setWelcome(false)}
                        scope={scope}
                        scopeName={scopeName}
                        onActiveChange={setChatActive}
                        analyticsUnlocked={insightsPro}
                        onOpenScopeSwitcher={() => setScopeOpen(true)}
                        onSelectClient={applyScope}
                    />
                )}
                {view === 'review' && <ReviewView scope={scope} scopeName={scopeName} items={reviewItems} setItems={setReviewItems} />}
                {view === 'insights' && <InsightsView scope={scope} scopeName={scopeName} pro={insightsPro} onUpgrade={upgradeInsights} />}
                {view === 'skills' && <SkillsView skills={skills} onEnable={enableSkill} />}
                {view === 'spaces' && <SpacesView spaces={spaces} onCreate={addSpace} />}
            </main>

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
                    onClose={() => navigate('')}
                    onComplete={() => { navigate(''); setView('chat'); setWelcome(true); setChatKey((k) => k + 1); }}
                />
            )}
        </div>
    );
}
