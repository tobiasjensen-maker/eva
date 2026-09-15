// The systems EVA is the front door onto — the client's whole business, pulled in
// behind e-conomic. One source of truth shared by the Focus cockpit's "One front
// door" tiles and the Routines → Connectors installed list, so the two always match.

export type System = {
    id: string;
    name: string;
    role: string;    // short subtitle (what it feeds)
    color: string;   // letter-tile background
    mark: string;    // letter/glyph on the tile
    category: string;
    native?: boolean; // e-conomic core — always connected
};

export const SYSTEMS: System[] = [
    { id: 'economic', name: 'e-conomic', role: 'Ledger & books · core', color: '#1c1b3a', mark: 'e', category: 'Core', native: true },
    { id: 'bank', name: 'Bank feeds', role: 'Live transactions · 40 clients', color: '#2f6fb0', mark: 'B', category: 'Banking' },
    { id: 'zenegy', name: 'Zenegy', role: 'Payroll & salaries', color: '#7c3aed', mark: 'Z', category: 'Payroll' },
    { id: 'shopify', name: 'Shopify', role: 'Till & online sales', color: '#15803d', mark: 'S', category: 'Commerce' },
    { id: 'minuba', name: 'Minuba', role: 'Field-service jobs & costs', color: '#d97706', mark: 'M', category: 'Field service' },
    { id: 'hubspot', name: 'HubSpot', role: 'Client CRM & pipeline', color: '#e8603c', mark: 'H', category: 'CRM' },
    { id: 'stripe', name: 'Stripe', role: 'Card & subscription payments', color: '#635bff', mark: '$', category: 'Payments' },
];
