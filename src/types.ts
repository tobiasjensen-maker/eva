export type ViewId = 'chat' | 'insights' | 'activity' | 'skills' | 'spaces' | 'customers';

export type SkillState = 'active' | 'idle' | 'locked';

export interface Skill {
    id: string;
    title: string;
    description: string;
    color: string; // circle color
    emoji: string;
    state: SkillState;
    stat?: string; // e.g. "2,847 entries this month"
    price?: number; // monthly DKK, for locked skills
}

export type AgentKey = 'accounting' | 'insights' | 'invoicing' | 'documents';

export interface AgentMeta {
    key: AgentKey;
    label: string;
    color: string;
}

export interface Space {
    id: string;
    title: string;
    description: string;
    updated: string;
    messages: number;
    emoji: string;
}
