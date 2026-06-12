import { useState, useEffect } from 'react';
import { Button, Icon } from '@economic/taco';
import { EconomicLogo, NodeMark, COLORS } from './ui';

type Step = 'auth' | 'consent' | 'importing' | 'ready';

const PERMISSIONS = [
    { icon: 'eye-on', title: 'Read your accounting data', desc: 'Accounts, entries, invoices, customers, documents and more.' },
    { icon: 'edit', title: 'Create & update data', desc: 'Book entries, draft invoices and update records on your behalf.' },
    { icon: 'delete', title: 'Delete data', desc: 'Remove entries or documents when you ask it to.' },
    { icon: 'ai-stars', title: 'Act across e-conomic', desc: 'Run skills and automations against your books.' },
];

const IMPORT_ITEMS = [
    'Accounting years',
    'Chart of accounts',
    'Customers',
    'Suppliers',
    'Invoices & bills',
    'Bank transactions',
    'Documents',
    'Products',
    'VAT settings',
];

export function Onboarding({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
    const [step, setStep] = useState<Step>('auth');
    const [done, setDone] = useState(0);

    useEffect(() => {
        if (step !== 'importing') return;
        setDone(0);
        // Hidden tabs throttle timers hard — skip the import animation there.
        if (document.visibilityState === 'hidden') {
            setDone(IMPORT_ITEMS.length);
            const id = setTimeout(() => setStep('ready'), 300);
            return () => clearTimeout(id);
        }
        let i = 0;
        const id = setInterval(() => {
            i++;
            setDone(i);
            if (i >= IMPORT_ITEMS.length) {
                clearInterval(id);
                setTimeout(() => setStep('ready'), 600);
            }
        }, 420);
        return () => clearInterval(id);
    }, [step]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ background: '#f1f1f2' }}>
            <div className="w-full flex flex-col items-center" style={{ maxWidth: 460 }}>
                <div className="mb-7">
                    <EconomicLogo />
                </div>

                <div className="w-full bg-white rounded-2xl p-7 anim-in" style={{ border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
                    {step === 'auth' && (
                        <div className="text-center">
                            <h1 className="text-xl font-semibold" style={{ color: COLORS.text }}>Welcome to e-conomic AI</h1>
                            <p className="text-sm mt-2 mb-6 leading-relaxed" style={{ color: COLORS.textMuted }}>
                                Your AI assistant for e-conomic — chat with your books, review agent work and automate the busywork. Sign in with your e-conomic account to get started.
                            </p>
                            <button
                                onClick={() => setStep('consent')}
                                className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold"
                                style={{ background: COLORS.text, color: '#fff' }}
                            >
                                <NodeMark size={18} /> Continue with e-conomic
                            </button>
                            <p className="text-xs mt-4" style={{ color: COLORS.textMuted }}>
                                By continuing you agree to the Terms and Privacy Policy.
                            </p>
                        </div>
                    )}

                    {step === 'consent' && (
                        <div>
                            <h1 className="text-lg font-semibold" style={{ color: COLORS.text }}>e-conomic AI wants access to your account</h1>
                            <p className="text-sm mt-1 mb-4" style={{ color: COLORS.textMuted }}>
                                To work with your books, the assistant needs permission to:
                            </p>
                            <div className="flex flex-col gap-3 mb-5">
                                {PERMISSIONS.map((p) => (
                                    <div key={p.title} className="flex items-start gap-3">
                                        <span className="flex items-center justify-center shrink-0 rounded-lg mt-0.5" style={{ width: 32, height: 32, background: '#f1f1f3', color: '#52525b' }}>
                                            <Icon name={p.icon as never} />
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: COLORS.text }}>{p.title}</p>
                                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.textMuted }}>{p.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-lg p-3 mb-5 flex items-start gap-2" style={{ background: '#f7f7f8' }}>
                                <Icon name="lock" style={{ color: COLORS.textMuted, marginTop: 1 }} />
                                <p className="text-xs" style={{ color: COLORS.textMuted }}>Your data stays in your e-conomic agreement. You can revoke access anytime in Settings.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={onClose}>Cancel</Button>
                                <Button appearance="primary" onClick={() => setStep('importing')}>Allow access</Button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div>
                            <h1 className="text-lg font-semibold" style={{ color: COLORS.text }}>Importing your e-conomic data…</h1>
                            <p className="text-sm mt-1 mb-4" style={{ color: COLORS.textMuted }}>This usually takes a few moments.</p>
                            <div className="rounded-full overflow-hidden mb-5" style={{ height: 6, background: '#ececed' }}>
                                <div style={{ height: '100%', width: `${Math.round((done / IMPORT_ITEMS.length) * 100)}%`, background: 'linear-gradient(90deg, #ff9a52, #ed9b2c)', transition: 'width .35s ease' }} />
                            </div>
                            <div className="flex flex-col gap-2.5">
                                {IMPORT_ITEMS.map((item, i) => {
                                    const state = i < done ? 'done' : i === done ? 'active' : 'todo';
                                    return (
                                        <div key={item} className="flex items-center gap-2.5">
                                            {state === 'done' ? (
                                                <span className="flex items-center justify-center shrink-0 rounded-full text-white" style={{ width: 18, height: 18, background: '#16a34a', fontSize: 11 }}><Icon name="tick" /></span>
                                            ) : state === 'active' ? (
                                                <span className="shrink-0 rounded-full border-2 animate-spin" style={{ width: 18, height: 18, borderColor: '#ed9b2c', borderTopColor: 'transparent' }} />
                                            ) : (
                                                <span className="shrink-0 rounded-full" style={{ width: 18, height: 18, border: '1.5px solid #d4d4d8' }} />
                                            )}
                                            <span className="text-sm" style={{ color: state === 'todo' ? COLORS.textMuted : COLORS.text }}>{item}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 'ready' && (
                        <div className="text-center">
                            <span className="inline-flex items-center justify-center rounded-full mb-4" style={{ width: 52, height: 52, background: '#ecfdf5', color: '#16a34a' }}>
                                <Icon name="circle-tick" />
                            </span>
                            <h1 className="text-xl font-semibold" style={{ color: COLORS.text }}>You're all set</h1>
                            <p className="text-sm mt-2 mb-6 leading-relaxed" style={{ color: COLORS.textMuted }}>
                                Imported 18,420 records from e-conomic across {IMPORT_ITEMS.length} areas. Your assistant is ready to go.
                            </p>
                            <Button appearance="primary" onClick={onComplete}>Get started</Button>
                        </div>
                    )}
                </div>

                {/* step dots */}
                <div className="flex items-center gap-1.5 mt-5">
                    {(['auth', 'consent', 'importing', 'ready'] as Step[]).map((s) => {
                        const order: Step[] = ['auth', 'consent', 'importing', 'ready'];
                        const active = order.indexOf(s) <= order.indexOf(step);
                        return <span key={s} className="rounded-full" style={{ width: active ? 18 : 6, height: 6, background: active ? '#ed9b2c' : '#d4d4d8', transition: 'width .2s, background .2s' }} />;
                    })}
                </div>
            </div>
        </div>
    );
}
