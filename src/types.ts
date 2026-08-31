export type ViewId = 'chat' | 'insights' | 'activity' | 'activitylog' | 'tasks' | 'skills' | 'spaces' | 'customers';

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

// Where a view came from: built by EVA, or pre-defined as part of an integration
// (e-conomic is the system default; other modules ship their own views).
export type ViewSource = 'eva' | 'econ' | 'advisory';

export interface Space {
    id: string;
    title: string;
    description: string;
    updated: string;
    messages: number;
    emoji: string;
    source?: ViewSource; // undefined → treated as EVA-created
}
