export type CommandPaletteItem = {
    id: string;
    label: string;
    run: () => void;
};
export declare function CommandPalette({ commands, open, onOpenChange, title, placeholder, emptyLabel, className, panelClassName, }: {
    commands: CommandPaletteItem[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    placeholder?: string;
    emptyLabel?: string;
    /** Overlay / root class overrides (z-index, backdrop). */
    className?: string;
    /** Dialog panel class overrides. */
    panelClassName?: string;
}): any;
