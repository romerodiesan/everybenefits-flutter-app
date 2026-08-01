import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
export declare function Button({ variant, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
}): any;
export declare function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): any;
export declare function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>): any;
export declare function Label({ children }: {
    children: ReactNode;
}): any;
export declare function Panel({ children, className, }: {
    children: ReactNode;
    className?: string;
}): any;
export declare function Badge({ children }: {
    children: ReactNode;
}): any;
export declare function Avatar({ name, photoUrl, size, className, }: {
    name: string;
    photoUrl?: string | null;
    size?: number;
    className?: string;
}): any;
