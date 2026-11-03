export type TemplatePart = {
    kind: 'text';
    value: string;
} | {
    kind: 'ref';
    name: string;
};
export declare function parseTemplate(text: string, field: string): TemplatePart[];
export declare function refsOf(parts: TemplatePart[]): string[];
export declare function templateIsSingleRef(parts: TemplatePart[]): string | null;
